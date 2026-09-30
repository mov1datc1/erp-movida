import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, isSuperAdmin } from '@/lib/rbac';
import { getStoredJiraLexLatinConfig, toJiraConfigView } from '@/lib/jiraClient';
import SoporteLexLatinClient from './SoporteLexLatinClient';

export const dynamic = 'force-dynamic';

function getDefaultReportPeriod() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

export default async function SoporteLexLatinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true },
  });
  if (!isSuperAdmin(profile) && !hasPermission(profile, 'soporte-lexlatin', 'ver')) redirect('/');

  const config = toJiraConfigView(await getStoredJiraLexLatinConfig());
  return <SoporteLexLatinClient initialConfig={config} defaultPeriod={getDefaultReportPeriod()} />;
}
