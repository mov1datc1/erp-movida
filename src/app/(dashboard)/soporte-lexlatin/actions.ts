'use server';

import { buildLexLatinMonthlyReport } from '@/lib/jiraClient';
import { hasPermission, isSuperAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

async function requireLexLatinAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');
  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true },
  });
  if (!isSuperAdmin(profile) && !hasPermission(profile, 'soporte-lexlatin', 'ver')) {
    throw new Error('No tienes permiso para consultar Soporte LexLatin.');
  }
  return profile;
}

export async function syncLexLatinMonthlyReport(period: string) {
  try {
    await requireLexLatinAccess();
    const data = await buildLexLatinMonthlyReport(period);
    return { success: true, data };
  } catch (error: unknown) {
    console.error('[LexLatin report] Sync failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No fue posible sincronizar los tickets de Jira.' };
  }
}
