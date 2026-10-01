import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { hasPermission, isSuperAdmin } from '@/lib/rbac';
import { getStoredJiraLexLatinConfig, toJiraConfigView } from '@/lib/jiraClient';
import SoporteLexLatinClient from './SoporteLexLatinClient';

export const dynamic = 'force-dynamic';

function getDefaultReportPeriod() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
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
