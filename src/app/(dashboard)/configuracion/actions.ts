'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasPermission, isSuperAdmin } from '@/lib/rbac';
import { decryptSecret, encryptSecret } from '@/lib/secretEncryption';
import type { EmailAccountInput, EmailAccountPurpose, EmailAccountView } from '@/types/emailAccounts';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { randomUUID } from 'node:crypto';
import {
  getEnvironmentOpenAIApiKey,
  getOpenAIClient,
  getStoredOpenAIConfig,
  type StoredOpenAIConfig,
} from '@/lib/openaiClient';
import type { OpenAIConfigInput, OpenAIConfigView } from '@/types/openAIConfig';
import type { JiraLexLatinConfigInput } from '@/types/jiraLexLatin';
import {
  getStoredJiraLexLatinConfig,
  testJiraConnection,
  toJiraConfigView,
  type StoredJiraLexLatinConfig,
} from '@/lib/jiraClient';

type StoredEmailAccount = Omit<EmailAccountView, 'tienePassword' | 'updatedAt'> & {
  passwordEncrypted: string;
  updatedAt: string;
};

async function requireConfigurationAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado.');

  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true },
  });

  if (!isSuperAdmin(profile) && !hasPermission(profile, 'configuracion', 'editar')) {
    throw new Error('No tienes permiso para administrar la configuración.');
  }
}

function getStoredEmailAccounts(config: unknown): StoredEmailAccount[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return [];
  const accounts = (config as { accounts?: unknown }).accounts;
  if (!Array.isArray(accounts)) return [];
  return accounts as StoredEmailAccount[];
}

function toEmailAccountView(account: StoredEmailAccount): EmailAccountView {
  const { passwordEncrypted, ...safeAccount } = account;
  return {
    ...safeAccount,
    tienePassword: Boolean(passwordEncrypted),
  };
}

function validateEmailAccount(input: EmailAccountInput) {
  if (!input.nombre.trim()) throw new Error('El nombre de la cuenta es obligatorio.');
  if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('Captura un correo electrónico válido.');
  if (!input.nombreRemitente.trim()) throw new Error('El nombre del remitente es obligatorio.');
  if (!input.usuario.trim()) throw new Error('El usuario del servidor es obligatorio.');
  if (!input.smtpHost.trim() || !input.imapHost.trim()) throw new Error('Los servidores SMTP e IMAP son obligatorios.');
  if (!Number.isInteger(input.smtpPort) || input.smtpPort < 1 || input.smtpPort > 65535) throw new Error('Puerto SMTP inválido.');
  if (!Number.isInteger(input.imapPort) || input.imapPort < 1 || input.imapPort > 65535) throw new Error('Puerto IMAP inválido.');
}

function toOpenAIConfigView(config: StoredOpenAIConfig | null): OpenAIConfigView {
  const environmentApiKey = getEnvironmentOpenAIApiKey();
  return {
    activa: config?.activa ?? Boolean(environmentApiKey),
    apiKeyConfigurada: Boolean(environmentApiKey || config?.apiKeyEncrypted),
    apiKeyUltimos4: environmentApiKey?.slice(-4) || config?.apiKeyUltimos4,
    organizationId: config?.organizationId || '',
    projectId: config?.projectId || '',
    modeloRapido: config?.modeloRapido || 'gpt-6-luna',
    modeloEquilibrado: config?.modeloEquilibrado || 'gpt-6.1-sol',
    modeloComplejo: config?.modeloComplejo || 'gpt-6-astra',
    limiteMensualUsd: config?.limiteMensualUsd ?? 100,
    limitePorEjecucionUsd: config?.limitePorEjecucionUsd ?? 2,
    fechaRotacion: config?.fechaRotacion,
    updatedAt: config?.updatedAt,
  };
}

// --- ROLES (AppRole) ---

export async function getAppRoles() {
  try {
    await requireConfigurationAdmin();
    const roles = await prisma.appRole.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: roles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAppRole(data: { nombre: string; descripcion?: string; permisos: any }) {
  try {
    await requireConfigurationAdmin();
    const role = await prisma.appRole.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        permisos: data.permisos // ya viene en formato objeto desde el cliente
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAppRole(id: string, data: { nombre: string; descripcion?: string; permisos: any }) {
  try {
    await requireConfigurationAdmin();
    const existing = await prisma.appRole.findUnique({ where: { id } });
    if (existing?.nombre === 'Admin' || existing?.nombre === 'Super Admin') {
      if (data.nombre !== existing.nombre) {
         return { success: false, error: 'No puedes cambiar el nombre de un rol reservado del sistema.' };
      }
    }

    const role = await prisma.appRole.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        permisos: data.permisos
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAppRole(id: string) {
  try {
    await requireConfigurationAdmin();
    const existing = await prisma.appRole.findUnique({ where: { id } });
    if (existing?.nombre === 'Admin' || existing?.nombre === 'Super Admin') {
      return { success: false, error: 'No puedes eliminar un rol reservado del sistema.' };
    }

    await prisma.appRole.delete({ where: { id } });
    revalidatePath('/configuracion');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- USUARIOS (Profile + Supabase Auth) ---

export async function getUsuarios() {
  try {
    await requireConfigurationAdmin();
    const profiles = await prisma.profile.findMany({
      include: {
        app_role: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: profiles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createUserWithRole(data: { email: string; nombre: string; app_role_id: string; password?: string }) {
  try {
    await requireConfigurationAdmin();
    const supabaseAdmin = createAdminClient();
    
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || 'TempPassword123!', // Si no proveen password, se usa una temporal
      email_confirm: true, // Auto-confirmar
      user_metadata: {
        nombre: data.nombre
      }
    });

    if (authError) throw new Error(`Error en Auth: ${authError.message}`);
    if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.');

    // 2. Crear o actualizar el Profile en Prisma
    // Nota: A veces el trigger de Supabase crea el profile vacío, así que usamos upsert o update si ya existe.
    // Buscamos si el trigger ya lo creó
    const existingProfile = await prisma.profile.findUnique({
      where: { auth_id: authData.user.id }
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { auth_id: authData.user.id },
        data: {
          nombre: data.nombre,
          app_role_id: data.app_role_id,
        }
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          auth_id: authData.user.id,
          email: data.email,
          nombre: data.nombre,
          app_role_id: data.app_role_id,
          rol: 'USER' // Mantenemos el rol default del sistema
        }
      });
    }

    revalidatePath('/configuracion');
    return { success: true, data: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(profileId: string, data: { nombre: string, app_role_id: string | null, password?: string }) {
  try {
    await requireConfigurationAdmin();
    const existing = await prisma.profile.findUnique({ where: { id: profileId } });
    if (existing?.rol === 'SUPERADMIN' && data.app_role_id !== existing.app_role_id) {
      return { success: false, error: 'No puedes cambiar el rol de un SUPER ADMIN.' };
    }

    if (data.password && existing?.auth_id) {
      const supabaseAdmin = createAdminClient();
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(existing.auth_id, {
        password: data.password
      });
      if (authError) throw new Error(`Error actualizando contraseña: ${authError.message}`);
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        nombre: data.nombre,
        app_role_id: data.app_role_id
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- INTEGRACIONES ---

export async function getIntegraciones() {
  try {
    await requireConfigurationAdmin();
    const integraciones = await prisma.integracion.findMany();
    const safeIntegraciones = integraciones
      .filter((integracion) => !['EMAIL_ACCOUNTS', 'OPENAI', 'JIRA_LEXLATIN'].includes(integracion.proveedor))
      .map((integracion) => {
      if (integracion.proveedor !== 'SMTP_CORREO') return integracion;

      const config = (integracion.config || {}) as Record<string, unknown>;
      const { pass: _pass, ...safeConfig } = config;
      return {
        ...integracion,
        config: {
          ...safeConfig,
          tienePassword: Boolean(_pass),
        },
      };
      });
    return { success: true, data: safeIntegraciones };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getEmailAccounts() {
  try {
    await requireConfigurationAdmin();
    const integration = await prisma.integracion.findUnique({
      where: { proveedor: 'EMAIL_ACCOUNTS' },
    });
    const accounts = getStoredEmailAccounts(integration?.config).map(toEmailAccountView);
    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveEmailAccount(input: EmailAccountInput) {
  try {
    await requireConfigurationAdmin();
    validateEmailAccount(input);

    const integration = await prisma.integracion.findUnique({
      where: { proveedor: 'EMAIL_ACCOUNTS' },
    });
    const accounts = getStoredEmailAccounts(integration?.config);
    const id = input.id || randomUUID();
    const existing = accounts.find((account) => account.id === id);
    const newPassword = input.password?.trim();
    const passwordEncrypted = newPassword
      ? encryptSecret(newPassword)
      : existing?.passwordEncrypted;

    if (!passwordEncrypted) {
      return { success: false, error: 'Captura la contraseña para crear esta cuenta.' };
    }

    const allowedPurposes: EmailAccountPurpose[] = ['FACTURACION', 'CONCILIACION', 'NOTIFICACIONES', 'AGENTES', 'GENERAL'];
    if (!allowedPurposes.includes(input.proposito)) {
      return { success: false, error: 'El propósito seleccionado no es válido.' };
    }

    const storedAccount: StoredEmailAccount = {
      id,
      nombre: input.nombre.trim(),
      proposito: input.proposito,
      nombreRemitente: input.nombreRemitente.trim(),
      email: input.email.trim().toLowerCase(),
      usuario: input.usuario.trim(),
      smtpHost: input.smtpHost.trim(),
      smtpPort: input.smtpPort,
      smtpSeguro: input.smtpSeguro,
      imapHost: input.imapHost.trim(),
      imapPort: input.imapPort,
      imapSeguro: input.imapSeguro,
      activa: input.activa,
      passwordEncrypted,
      updatedAt: new Date().toISOString(),
    };

    const updatedAccounts = existing
      ? accounts.map((account) => account.id === id ? storedAccount : account)
      : [...accounts, storedAccount];

    await prisma.integracion.upsert({
      where: { proveedor: 'EMAIL_ACCOUNTS' },
      update: {
        config: JSON.parse(JSON.stringify({ accounts: updatedAccounts })),
        activa: updatedAccounts.some((account) => account.activa),
      },
      create: {
        proveedor: 'EMAIL_ACCOUNTS',
        config: JSON.parse(JSON.stringify({ accounts: updatedAccounts })),
        activa: updatedAccounts.some((account) => account.activa),
      },
    });

    revalidatePath('/configuracion');
    return { success: true, data: updatedAccounts.map(toEmailAccountView) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testEmailAccount(accountId: string) {
  try {
    await requireConfigurationAdmin();
    const integration = await prisma.integracion.findUnique({
      where: { proveedor: 'EMAIL_ACCOUNTS' },
    });
    const account = getStoredEmailAccounts(integration?.config).find(({ id }) => id === accountId);

    if (!account) return { success: false, error: 'Cuenta de correo no encontrada.' };
    if (!account.activa) return { success: false, error: 'Activa la cuenta antes de probarla.' };

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSeguro,
      auth: {
        user: account.usuario,
        pass: decryptSecret(account.passwordEncrypted),
      },
    });

    await transporter.verify();

    const imapClient = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSeguro,
      auth: {
        user: account.usuario,
        pass: decryptSecret(account.passwordEncrypted),
      },
      logger: false,
    });
    try {
      await imapClient.connect();
      await imapClient.mailboxOpen('INBOX', { readOnly: true });
    } finally {
      await imapClient.logout().catch(() => undefined);
    }

    const result = await transporter.sendMail({
      from: `"${account.nombreRemitente.replaceAll('"', '')}" <${account.email}>`,
      to: account.email,
      subject: '[Movida ERP] Prueba SMTP e IMAP',
      text: `La cuenta ${account.nombre} quedó conectada correctamente al ERP Movida para enviar por SMTP y recibir por IMAP.`,
    });

    return { success: true, message: `SMTP e IMAP correctos. Prueba enviada a ${account.email}.`, messageId: result.messageId };
  } catch (error: any) {
    console.error('[Email accounts] Test failed:', error);
    const code = String(error?.code || '').toUpperCase();
    const responseCode = Number(error?.responseCode || 0);
    const message = String(error?.message || '');
    if (code === 'EAUTH' || responseCode === 535 || /535|authentication|invalid login/i.test(message)) {
      return { success: false, error: 'SiteGround rechazó el usuario o la contraseña. Usa como usuario la dirección completa del buzón y la contraseña propia de esa cuenta de correo, no la contraseña del panel de SiteGround.' };
    }
    if (code === 'ETIMEDOUT' || /timed?out/i.test(message)) {
      return { success: false, error: 'El servidor no respondió. Si mail.movidatci.com está detrás del proxy de Cloudflare, usa el hostname exacto mostrado por SiteGround en Mail Configuration, por ejemplo gvam1133.siteground.biz.' };
    }
    if (/certificate|self signed|hostname/i.test(message)) {
      return { success: false, error: 'El certificado TLS no coincide con el servidor. Usa el hostname exacto indicado por SiteGround y mantén activada la conexión segura.' };
    }
    return { success: false, error: message || 'No fue posible validar SMTP e IMAP.' };
  }
}

export async function getOpenAIConfiguration() {
  try {
    await requireConfigurationAdmin();
    return { success: true, data: toOpenAIConfigView(await getStoredOpenAIConfig()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveOpenAIConfiguration(input: OpenAIConfigInput) {
  try {
    await requireConfigurationAdmin();
    const existing = await getStoredOpenAIConfig();
    const environmentApiKey = getEnvironmentOpenAIApiKey();
    const newApiKey = input.apiKey?.trim();
    const apiKeyEncrypted = newApiKey
      ? encryptSecret(newApiKey)
      : existing?.apiKeyEncrypted || '';

    if (!environmentApiKey && !apiKeyEncrypted) {
      return { success: false, error: 'Configura OPENAI_API_KEY o API_OPENAI_ERP en el servidor, o captura una API key de proyecto.' };
    }
    if (!input.modeloRapido.trim() || !input.modeloEquilibrado.trim() || !input.modeloComplejo.trim()) {
      return { success: false, error: 'Configura los tres perfiles de modelo.' };
    }
    if (input.limiteMensualUsd < 0 || input.limitePorEjecucionUsd < 0) {
      return { success: false, error: 'Los límites de gasto no pueden ser negativos.' };
    }

    const stored: StoredOpenAIConfig = {
      activa: input.activa,
      apiKeyEncrypted,
      apiKeyUltimos4: newApiKey
        ? newApiKey.slice(-4)
        : environmentApiKey?.slice(-4) || existing?.apiKeyUltimos4,
      organizationId: input.organizationId.trim(),
      projectId: input.projectId.trim(),
      modeloRapido: input.modeloRapido.trim(),
      modeloEquilibrado: input.modeloEquilibrado.trim(),
      modeloComplejo: input.modeloComplejo.trim(),
      limiteMensualUsd: input.limiteMensualUsd,
      limitePorEjecucionUsd: input.limitePorEjecucionUsd,
      fechaRotacion: input.fechaRotacion || undefined,
      updatedAt: new Date().toISOString(),
    };

    await prisma.integracion.upsert({
      where: { proveedor: 'OPENAI' },
      update: {
        config: JSON.parse(JSON.stringify(stored)),
        activa: stored.activa,
      },
      create: {
        proveedor: 'OPENAI',
        config: JSON.parse(JSON.stringify(stored)),
        activa: stored.activa,
      },
    });

    revalidatePath('/configuracion');
    return { success: true, data: toOpenAIConfigView(stored) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testOpenAIConfiguration() {
  try {
    await requireConfigurationAdmin();
    const { client, config } = await getOpenAIClient();
    const response = await client.responses.create({
      model: config.modeloEquilibrado,
      input: 'Responde solamente con la palabra OK.',
      max_output_tokens: 64,
      store: false,
    });

    return {
      success: true,
      message: `Conexión exitosa con ${config.modeloEquilibrado}.`,
      output: response.output_text,
    };
  } catch (error: any) {
    console.error('[OpenAI config] Connection test failed:', error);
    return { success: false, error: error.message || 'No fue posible conectar con OpenAI.' };
  }
}

export async function getJiraLexLatinConfiguration() {
  try {
    await requireConfigurationAdmin();
    return { success: true, data: toJiraConfigView(await getStoredJiraLexLatinConfig()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function validateJiraConfig(input: JiraLexLatinConfigInput) {
  let url: URL;
  try {
    url = new URL(input.siteUrl);
  } catch {
    throw new Error('Captura una URL válida para el sitio de Jira.');
  }
  if (url.protocol !== 'https:') throw new Error('La URL de Jira debe usar HTTPS.');
  if (!url.hostname.endsWith('.atlassian.net')) throw new Error('La URL debe corresponder al sitio *.atlassian.net.');
  if (!/^\S+@\S+\.\S+$/.test(input.accountEmail)) throw new Error('Captura el correo de la cuenta técnica de Jira.');
  if (!/^[A-Z][A-Z0-9_]+$/.test(input.projectKey.trim().toUpperCase())) throw new Error('La clave de proyecto de Jira no es válida.');
  if (!/^\S+@\S+\.\S+$/.test(input.approverOperationsEmail)) throw new Error('El correo del aprobador operativo no es válido.');
  if (!/^\S+@\S+\.\S+$/.test(input.approverDeliveryEmail)) throw new Error('El correo del aprobador de envío no es válido.');
  if (!/^\S+@\S+\.\S+$/.test(input.recipientTo)) throw new Error('El destinatario principal no es válido.');
  if (!Number.isInteger(input.cutoffStartDay) || !Number.isInteger(input.cutoffEndDay)
    || input.cutoffStartDay < 1 || input.cutoffEndDay > 28 || input.cutoffStartDay > input.cutoffEndDay) {
    throw new Error('La ventana de corte debe estar entre los días 1 y 28.');
  }
}

export async function saveJiraLexLatinConfiguration(input: JiraLexLatinConfigInput) {
  try {
    await requireConfigurationAdmin();
    validateJiraConfig(input);
    const existing = await getStoredJiraLexLatinConfig();
    const newToken = input.apiToken?.trim();
    const apiTokenEncrypted = newToken ? encryptSecret(newToken) : existing?.apiTokenEncrypted;
    if (!apiTokenEncrypted) return { success: false, error: 'Captura un token API de Atlassian.' };

    const stored: StoredJiraLexLatinConfig = {
      activa: input.activa,
      siteUrl: input.siteUrl.trim().replace(/\/+$/, ''),
      accountEmail: input.accountEmail.trim().toLowerCase(),
      apiTokenEncrypted,
      tokenLast4: newToken ? newToken.slice(-4) : existing?.tokenLast4,
      projectKey: input.projectKey.trim().toUpperCase(),
      timeWorkedFieldId: input.timeWorkedFieldId.trim(),
      targetDateFieldId: input.targetDateFieldId.trim(),
      approverOperationsEmail: input.approverOperationsEmail.trim().toLowerCase(),
      approverDeliveryEmail: input.approverDeliveryEmail.trim().toLowerCase(),
      recipientTo: input.recipientTo.trim().toLowerCase(),
      recipientCc: input.recipientCc.trim(),
      cutoffStartDay: input.cutoffStartDay,
      cutoffEndDay: input.cutoffEndDay,
      updatedAt: new Date().toISOString(),
    };

    await prisma.integracion.upsert({
      where: { proveedor: 'JIRA_LEXLATIN' },
      update: { config: JSON.parse(JSON.stringify(stored)), activa: stored.activa },
      create: { proveedor: 'JIRA_LEXLATIN', config: JSON.parse(JSON.stringify(stored)), activa: stored.activa },
    });
    revalidatePath('/configuracion');
    revalidatePath('/soporte-lexlatin');
    return { success: true, data: toJiraConfigView(stored) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testJiraLexLatinConfiguration() {
  try {
    await requireConfigurationAdmin();
    const result = await testJiraConnection();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[Jira LexLatin] Connection test failed:', error);
    return { success: false, error: error.message || 'No fue posible conectar con Jira.' };
  }
}

import { sendTestEmail } from '@/lib/email';

export async function saveIntegracion(proveedor: string, config: any, activa: boolean) {
  try {
    await requireConfigurationAdmin();
    const intg = await prisma.integracion.upsert({
      where: { proveedor },
      update: {
        config,
        activa
      },
      create: {
        proveedor,
        config,
        activa
      }
    });
    revalidatePath('/configuracion');
    return { success: true, data: intg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendTestSMTPEmailAction(emailToTest?: string) {
  try {
    await requireConfigurationAdmin();
    const res = await sendTestEmail(emailToTest);
    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
