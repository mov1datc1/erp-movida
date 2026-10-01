'use server';

import { buildLexLatinMonthlyReport } from '@/lib/jiraClient';
import { hasPermission, isSuperAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { getStoredJiraLexLatinConfig } from '@/lib/jiraClient';
import { getLatestLexLatinReportSnapshot, getLexLatinAgentRequests, pollLexLatinEmailReplies, saveLexLatinReportSnapshot, sendLexLatinValidationEmail } from '@/lib/lexLatinAgent';

async function requireLexLatinAccess(action: 'ver' | 'editar' = 'ver') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');
  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true },
  });
  if (!isSuperAdmin(profile) && !hasPermission(profile, 'soporte-lexlatin', action)) {
    throw new Error('No tienes permiso para consultar Soporte LexLatin.');
  }
  return profile;
}

export async function loadLexLatinAgentRequests() {
  try {
    await requireLexLatinAccess();
    return { success: true, data: await getLexLatinAgentRequests() };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible consultar las solicitudes.' };
  }
}

export async function loadCachedLexLatinReport() {
  try {
    await requireLexLatinAccess();
    return { success: true, data: await getLatestLexLatinReportSnapshot() };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible recuperar el último reporte.' };
  }
}

export async function sendLexLatinValidationTest(period: string) {
  try {
    await requireLexLatinAccess('editar');
    const config = await getStoredJiraLexLatinConfig();
    if (!config?.approverOperationsEmail) throw new Error('Configura el correo del aprobador operativo.');
    const report = await buildLexLatinMonthlyReport(period);
    const data = await sendLexLatinValidationEmail(report, config.approverOperationsEmail, 'TEST');
    return { success: true, data };
  } catch (error: unknown) {
    console.error('[LexLatin agent] Validation email failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible enviar la validación.' };
  }
}

export async function checkLexLatinValidationReplies() {
  try {
    await requireLexLatinAccess('editar');
    const config = await getStoredJiraLexLatinConfig();
    if (!config?.approverOperationsEmail) throw new Error('Configura el correo del aprobador operativo.');
    const result = await pollLexLatinEmailReplies(config.approverOperationsEmail);
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error('[LexLatin agent] Reply polling failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible revisar las respuestas.' };
  }
}

export async function syncLexLatinMonthlyReport(period: string) {
  try {
    await requireLexLatinAccess();
    const data = await buildLexLatinMonthlyReport(period);
    await saveLexLatinReportSnapshot(data);
    return { success: true, data };
  } catch (error: unknown) {
    console.error('[LexLatin report] Sync failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible sincronizar los tickets de Jira.' };
  }
}
