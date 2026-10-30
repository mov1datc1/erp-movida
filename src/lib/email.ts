import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { TareaStatus } from '@prisma/client';
import { decryptSecret } from '@/lib/secretEncryption';

export interface TaskStatusNotificationParams {
  taskTitle: string;
  oldStatus: TareaStatus | string;
  newStatus: TareaStatus | string;
  proyectoNombre: string;
  sprintNumero?: number | null;
  sprintNombre?: string | null;
  usuarioNombre?: string | null;
}

export interface TaskCreatedNotificationParams {
  taskTitle: string;
  descripcion?: string | null;
  proyectoNombre?: string | null;
  clienteNombre?: string | null;
  sprintNumero?: number | null;
  sprintNombre?: string | null;
  encargadosNombres?: string[] | string | null;
  encargadosEmails?: string[] | null;
  prioridad?: string | null;
  estatus?: string | null;
  fechaLimite?: Date | string | null;
  usuarioNombre?: string | null;
  taskUrl?: string | null;
}

const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: '#f1f5f9', text: '#475569' },
  EN_CURSO: { label: 'En Curso', bg: '#e0e7ff', text: '#3730a3' },
  ON_HOLD: { label: 'On Hold', bg: '#f3e8ff', text: '#6b21a8' },
  COMPLETADA: { label: 'Completada', bg: '#d1fae5', text: '#065f46' },
  CANCELADA: { label: 'Cancelada', bg: '#fee2e2', text: '#991b1b' },
};

const priorityBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
  URGENTE: { label: 'Urgente', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  ALTA: { label: 'Alta', bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  MEDIA: { label: 'Media', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  BAJA: { label: 'Baja', bg: '#dcfce7', text: '#166534', border: '#86efac' },
};

/**
 * Retrieves the active notifications account or falls back to the legacy
 * SMTP integration/environment variables during migration.
 */
export async function getSMTPConfig() {
  const defaultHost = process.env.SMTP_HOST || 'gvam1133.siteground.biz';
  const defaultPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const defaultUser = process.env.SMTP_USER || '';
  const defaultPass = process.env.SMTP_PASS || '';
  const defaultRecipients = process.env.SMTP_NOTIFY_EMAILS || 'info@movidatci.com';

  try {
    // 1. Check EMAIL_ACCOUNTS for a dedicated NOTIFICACIONES account
    const emailAccountsIntegration = await prisma.integracion.findUnique({
      where: { proveedor: 'EMAIL_ACCOUNTS' },
    });
    const accountsConfig = emailAccountsIntegration?.config as { accounts?: Array<Record<string, unknown>> } | null;
    const accounts = Array.isArray(accountsConfig?.accounts) ? accountsConfig.accounts : [];
    const notifAccount = accounts.find((account) => account.activa === true && account.proposito === 'NOTIFICACIONES');

    if (notifAccount && typeof notifAccount.passwordEncrypted === 'string') {
      try {
        const pass = decryptSecret(notifAccount.passwordEncrypted);
        return {
          host: String(notifAccount.smtpHost || defaultHost),
          port: Number(notifAccount.smtpPort || defaultPort),
          user: String(notifAccount.usuario || notifAccount.email || defaultUser),
          pass,
          recipients: defaultRecipients,
          activa: true,
          secure: notifAccount.smtpSeguro !== false,
          fromName: String(notifAccount.nombreRemitente || 'Movida ERP Notificaciones'),
        };
      } catch (err) {
        console.warn('[SMTP] Could not decrypt NOTIFICACIONES account password:', err);
      }
    }

    // 2. Check direct SMTP_CORREO in Integracion (SiteGround SMTP)
    const dbIntegration = await prisma.integracion.findUnique({
      where: { proveedor: 'SMTP_CORREO' },
    });

    if (dbIntegration && dbIntegration.config) {
      const cfg = dbIntegration.config as any;
      if (cfg.user && cfg.pass) {
        return {
          host: cfg.host || defaultHost,
          port: parseInt(cfg.port || `${defaultPort}`, 10),
          user: cfg.user,
          pass: cfg.pass,
          recipients: cfg.recipients || cfg.destinatarios || defaultRecipients,
          activa: dbIntegration.activa !== false,
          secure: parseInt(cfg.port || `${defaultPort}`, 10) === 465,
          fromName: 'Movida ERP Notificaciones',
        };
      }
    }

    // 3. Fallback: Any active account in EMAIL_ACCOUNTS if it can be decrypted
    const anyAccount = accounts.find((account) => account.activa === true);
    if (anyAccount && typeof anyAccount.passwordEncrypted === 'string') {
      try {
        const pass = decryptSecret(anyAccount.passwordEncrypted);
        return {
          host: String(anyAccount.smtpHost || defaultHost),
          port: Number(anyAccount.smtpPort || defaultPort),
          user: String(anyAccount.usuario || anyAccount.email || defaultUser),
          pass,
          recipients: defaultRecipients,
          activa: true,
          secure: anyAccount.smtpSeguro !== false,
          fromName: String(anyAccount.nombreRemitente || 'Movida ERP Notificaciones'),
        };
      } catch (err) {
        console.warn('[SMTP] Could not decrypt account password:', err);
      }
    }
  } catch (error) {
    console.error('Error fetching SMTP config from DB, using fallback defaults:', error);
  }

  return {
    host: defaultHost,
    port: defaultPort,
    user: defaultUser,
    pass: defaultPass,
    recipients: defaultRecipients,
    activa: Boolean(defaultUser && defaultPass),
    secure: defaultPort === 465,
    fromName: 'Movida ERP Notificaciones',
  };
}

/**
 * Creates nodemailer transporter from configuration
 */
export async function getMailTransporter() {
  const config = await getSMTPConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  return { transporter, config };
}

/**
 * Sends notification email when a card status changes
 */
export async function sendTaskStatusNotification(params: TaskStatusNotificationParams) {
  try {
    const { transporter, config } = await getMailTransporter();

    if (!config.activa) {
      console.log('SMTP notification skipped: integration is disabled.');
      return { success: false, reason: 'Integration disabled' };
    }

    const recipientsList = config.recipients
      .split(/[,;\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientsList.length === 0) {
      console.log('SMTP notification skipped: no recipients configured.');
      return { success: false, reason: 'No recipients configured' };
    }

    const oldBadge = statusLabels[params.oldStatus] || { label: params.oldStatus, bg: '#f1f5f9', text: '#334155' };
    const newBadge = statusLabels[params.newStatus] || { label: params.newStatus, bg: '#e0e7ff', text: '#3730a3' };
    const sprintText = params.sprintNumero ? `Sprint #${params.sprintNumero}${params.sprintNombre ? ` - ${params.sprintNombre}` : ''}` : 'Sin Sprint';

    const fechaHoraStr = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `[Movida ERP] Movimiento de Tarjeta: "${params.taskTitle}" ➔ ${newBadge.label}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Movimiento de Tarjeta</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-family: monospace;">
                      Movida ERP — Alerta Kanban
                    </span>
                    <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      Movimiento de Tarjeta en Proyecto
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Proyecto</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      ${params.proyectoNombre}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Sprint</span>
                    <div style="font-size: 14px; font-weight: 700; color: #475569; margin-top: 2px;">
                      ${sprintText}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nombre de la Tarjeta</span>
                    <div style="font-size: 15px; font-weight: 800; color: #4338ca; margin-top: 2px;">
                      ${params.taskTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Realizado Por / Autor</span>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      👤 ${params.usuarioNombre || 'Usuario de Movida ERP'}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 16px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                      Movimiento Realizado
                    </span>
                    <div style="font-size: 14px; font-weight: 700; display: inline-block;">
                      <span style="background-color: ${oldBadge.bg}; color: ${oldBadge.text}; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">
                        ${oldBadge.label}
                      </span>
                      <span style="margin: 0 8px; color: #94a3b8; font-size: 16px;">➔</span>
                      <span style="background-color: ${newBadge.bg}; color: ${newBadge.text}; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">
                        ${newBadge.label}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
                <strong>Fecha del movimiento:</strong> ${fechaHoraStr}
              </p>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app'}/proyectos" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                  Ver Tablero Kanban en Movida ERP
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              Notificación automática generada por <strong>Movida ERP</strong> — Movida TCI LLC<br>
              Este correo fue enviado a la lista de notificación configurada en el sistema.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.fromName.replaceAll('"', '')}" <${config.user}>`,
      to: recipientsList,
      subject,
      html: htmlBody,
    });

    console.log(`[SMTP] Task notification sent to ${recipientsList.join(', ')}. MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[SMTP] Error sending task status notification:', error);
    return { success: false, error: error.message || 'Error sending email' };
  }
}

export interface SubtaskNotificationParams {
  taskTitle: string;
  subtareaTexto: string;
  subtareaCompletada: boolean;
  totalSubtareas: number;
  completadasSubtareas: number;
  proyectoNombre: string;
  sprintNumero?: number | null;
  sprintNombre?: string | null;
  usuarioNombre?: string | null;
  allSubtareas?: Array<{ texto: string; completada: boolean }>;
}

/**
 * Sends notification email when a subtask checklist item is toggled
 */
export async function sendSubtaskUpdateNotification(params: SubtaskNotificationParams) {
  try {
    const { transporter, config } = await getMailTransporter();

    if (!config.activa) {
      return { success: false, reason: 'Integration disabled' };
    }

    const recipientsList = config.recipients
      .split(/[,;\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientsList.length === 0) {
      return { success: false, reason: 'No recipients configured' };
    }

    const sprintText = params.sprintNumero ? `Sprint #${params.sprintNumero}${params.sprintNombre ? ` - ${params.sprintNombre}` : ''}` : 'Sin Sprint';
    const statusText = params.subtareaCompletada ? 'COMPLETADA ✅' : 'PENDIENTE ☐';
    const porcentaje = params.totalSubtareas > 0 ? Math.round((params.completadasSubtareas / params.totalSubtareas) * 100) : 0;

    const fechaHoraStr = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `[Movida ERP] Checklist Actualizado: "${params.taskTitle}" (${params.completadasSubtareas}/${params.totalSubtareas})`;

    const subtareasRows = (params.allSubtareas || [])
      .map(
        sub => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-size: 13px; color: ${sub.completada ? '#059669' : '#334155'}; font-weight: ${sub.completada ? '700' : '500'};">
            ${sub.completada ? '☑' : '☐'} ${sub.texto}
          </td>
          <td style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-align: right; color: ${sub.completada ? '#059669' : '#64748b'};">
            ${sub.completada ? 'Completado' : 'Pendiente'}
          </td>
        </tr>`
      )
      .join('');

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Actualización de Checklist</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-family: monospace;">
                Movida ERP — Avance de Entregables
              </span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Actualización de Checklist de Subtareas
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Proyecto</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      ${params.proyectoNombre}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Sprint</span>
                    <div style="font-size: 14px; font-weight: 700; color: #475569; margin-top: 2px;">
                      ${sprintText}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tarjeta</span>
                    <div style="font-size: 15px; font-weight: 800; color: #059669; margin-top: 2px;">
                      ${params.taskTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Actividad Modificada</span>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                      "${params.subtareaTexto}" ➔ <span style="color: ${params.subtareaCompletada ? '#059669' : '#dc2626'}; font-weight: 800;">${statusText}</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Realizado Por / Autor</span>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      👤 ${params.usuarioNombre || 'Usuario de Movida ERP'}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 16px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">
                      Progreso General del Checklist (${params.completadasSubtareas}/${params.totalSubtareas} - ${porcentaje}%)
                    </span>
                    <div style="background-color: #e2e8f0; height: 10px; border-radius: 10px; overflow: hidden;">
                      <div style="background-color: #059669; width: ${porcentaje}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                  </td>
                </tr>
              </table>

              ${subtareasRows ? `
              <div style="margin-bottom: 24px;">
                <span style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 12px;">
                  Detalle de Actividades del Checklist:
                </span>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                  ${subtareasRows}
                </table>
              </div>
              ` : ''}

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
                <strong>Fecha del cambio:</strong> ${fechaHoraStr}
              </p>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app'}/proyectos" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                  Ver Tarjeta en Movida ERP
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              Notificación automática generada por <strong>Movida ERP</strong> — Movida TCI LLC
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.fromName.replaceAll('"', '')}" <${config.user}>`,
      to: recipientsList,
      subject,
      html: htmlBody,
    });

    console.log(`[SMTP] Subtask update notification sent to ${recipientsList.join(', ')}.`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[SMTP] Error sending subtask notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a test email to verify SMTP configuration
 */
export async function sendTestEmail(targetEmail?: string) {
  try {
    const { transporter, config } = await getMailTransporter();
    const recipient = targetEmail || config.recipients.split(/[,;\n]/)[0] || config.user;

    const info = await transporter.sendMail({
      from: `"${config.fromName.replaceAll('"', '')}" <${config.user}>`,
      to: recipient,
      subject: '[Movida ERP] Prueba de Conexión SMTP Exitosa',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 16px;">
          <h2 style="color: #4f46e5;">¡Conexión SMTP Configurada Correctamente! 🎉</h2>
          <p style="color: #334155; font-size: 14px;">
            El servidor SMTP <strong>${config.host}:${config.port}</strong> mediante el correo <strong>${config.user}</strong> está funcionando correctamente.
          </p>
          <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
            Enviado desde Movida ERP para confirmar las notificaciones Kanban.
          </p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId, recipient };
  } catch (error: any) {
    console.error('[SMTP] Test email failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a notification email when a new task is created or assigned
 */
export async function sendTaskCreatedNotification(params: TaskCreatedNotificationParams) {
  try {
    const { transporter, config } = await getMailTransporter();

    if (!config.activa) {
      console.log('SMTP notification skipped: integration is disabled.');
      return { success: false, reason: 'Integration disabled' };
    }

    const recipientsList = config.recipients
      .split(/[,;\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    const directEmails = (params.encargadosEmails || [])
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0 && e.includes('@'));

    let toEmails: string[] = [];
    let ccEmails: string[] = [];

    if (directEmails.length > 0) {
      toEmails = directEmails;
      // Copy general notification recipients if they are not already in toEmails
      ccEmails = recipientsList.filter((e: string) => !directEmails.includes(e));
    } else {
      toEmails = recipientsList;
    }

    if (toEmails.length === 0) {
      console.log('SMTP notification skipped: no recipients configured.');
      return { success: false, reason: 'No recipients configured' };
    }

    const prioridadBadge = priorityBadges[params.prioridad || 'MEDIA'] || priorityBadges.MEDIA;
    
    const formatFecha = (d: Date | string | null | undefined) => {
      if (!d) return 'Sin fecha límite definida';
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return 'Sin fecha límite definida';
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    const fechaLimiteStr = formatFecha(params.fechaLimite);
    const fechaHoraStr = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const clienteProyectoStr = params.clienteNombre 
      ? (params.proyectoNombre ? `${params.clienteNombre} — ${params.proyectoNombre}` : params.clienteNombre)
      : (params.proyectoNombre || 'General / Interno');

    const encargadosStr = Array.isArray(params.encargadosNombres)
      ? (params.encargadosNombres.length > 0 ? params.encargadosNombres.join(', ') : 'Sin asignar')
      : (params.encargadosNombres || 'Sin asignar');

    const taskUrl = params.taskUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app'}/tareas`;

    const subject = `[Movida ERP] Nueva Tarea Asignada: "${params.taskTitle}" (${clienteProyectoStr})`;

    const descripcionHtml = params.descripcion && params.descripcion.trim() ? `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Detalle / Instrucciones</span>
          <div style="font-size: 14px; color: #1e293b; margin-top: 6px; line-height: 1.6; white-space: pre-wrap; background-color: #ffffff; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
            ${params.descripcion.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}
          </div>
        </td>
      </tr>
    ` : '';

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Tarea Asignada</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%); color: #ffffff;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-family: monospace;">
                      Movida ERP — Gestor de Tareas
                    </span>
                    <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      Nueva Tarea Asignada 📋
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Hola <strong>${encargadosStr}</strong>, se ha registrado una nueva tarea en <strong>Movida ERP</strong> con los siguientes detalles:
              </p>

              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Cliente / Proyecto</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      📁 ${clienteProyectoStr}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nombre de la Tarea</span>
                    <div style="font-size: 16px; font-weight: 800; color: #2563eb; margin-top: 2px;">
                      ${params.taskTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Encargado(s)</span>
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      👤 ${encargadosStr}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Prioridad</span>
                          <div style="margin-top: 4px;">
                            <span style="display: inline-block; background-color: ${prioridadBadge.bg}; color: ${prioridadBadge.text}; border: 1px solid ${prioridadBadge.border}; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 8px;">
                              ${prioridadBadge.label}
                            </span>
                          </div>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Fecha Límite</span>
                          <div style="font-size: 14px; font-weight: 800; color: #dc2626; margin-top: 4px;">
                            📅 ${fechaLimiteStr}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${descripcionHtml}

                <tr>
                  <td style="padding-top: 12px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Registrada Por</span>
                    <div style="font-size: 13px; font-weight: 600; color: #475569; margin-top: 2px;">
                      ${params.usuarioNombre || 'Sistema Movida ERP'}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
                <strong>Fecha de registro:</strong> ${fechaHoraStr}
              </p>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${taskUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
                  Abrir Gestor de Tareas en Movida ERP ➔
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              Notificación automática generada por <strong>Movida ERP</strong> — Movida TCI LLC<br>
              Enviado a ${toEmails.join(', ')}${ccEmails.length > 0 ? ` (CC: ${ccEmails.join(', ')})` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const sendOptions: nodemailer.SendMailOptions = {
      from: `"${config.fromName.replaceAll('"', '')}" <${config.user}>`,
      to: toEmails,
      subject,
      html: htmlBody,
    };

    if (ccEmails.length > 0) {
      sendOptions.cc = ccEmails;
    }

    const info = await transporter.sendMail(sendOptions);

    console.log(`[SMTP] Task created notification sent. To: ${toEmails.join(', ')} CC: ${ccEmails.join(', ')}. MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, to: toEmails, cc: ccEmails };
  } catch (error: any) {
    console.error('[SMTP] Error sending task created notification:', error);
    return { success: false, error: error.message || 'Error sending email' };
  }
}

/**
 * Sends a task notification email by task ID
 */
export async function sendTaskNotificationById(taskId: string, targetEmail?: string) {
  try {
    const tarea = await prisma.tarea.findUnique({
      where: { id: taskId },
      include: {
        cliente: { select: { nombre: true } },
        proyecto: { select: { nombre: true } },
        sprint: { select: { numero: true, nombre: true } },
        encargados: { select: { id: true, nombre: true, email: true } },
      },
    });

    if (!tarea) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const directEmails = targetEmail
      ? [targetEmail]
      : (tarea.encargados.map(e => e.email).filter(Boolean) as string[]);

    return sendTaskCreatedNotification({
      taskTitle: tarea.titulo,
      descripcion: tarea.descripcion,
      clienteNombre: tarea.cliente?.nombre,
      proyectoNombre: tarea.proyecto?.nombre,
      sprintNumero: tarea.sprint?.numero,
      sprintNombre: tarea.sprint?.nombre,
      encargadosNombres: tarea.encargados.map(e => e.nombre),
      encargadosEmails: directEmails,
      prioridad: tarea.prioridad,
      estatus: tarea.estatus,
      fechaLimite: tarea.fecha_limite,
    });
  } catch (error: any) {
    console.error('[SMTP] Error in sendTaskNotificationById:', error);
    return { success: false, error: error.message };
  }
}
