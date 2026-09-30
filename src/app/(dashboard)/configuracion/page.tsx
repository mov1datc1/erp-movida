import React from "react";
import ConfiguracionClient from "./ConfiguracionClient";
import { getAppRoles, getUsuarios, getIntegraciones, getEmailAccounts, getJiraLexLatinConfiguration, getOpenAIConfiguration } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true },
  });
  if (!isSuperAdmin(profile) && !hasPermission(profile, 'configuracion', 'ver')) {
    redirect('/');
  }

  const [rolesRes, usuariosRes, integracionesRes, emailAccountsRes, openAIRes, jiraLexLatinRes] = await Promise.all([
    getAppRoles(),
    getUsuarios(),
    getIntegraciones(),
    getEmailAccounts(),
    getOpenAIConfiguration(),
    getJiraLexLatinConfiguration(),
  ]);

  const roles = (rolesRes.success && rolesRes.data) ? rolesRes.data : [];
  const usuarios = (usuariosRes.success && usuariosRes.data) ? usuariosRes.data : [];
  const integraciones = (integracionesRes.success && integracionesRes.data) ? integracionesRes.data : [];
  const emailAccounts = (emailAccountsRes.success && emailAccountsRes.data) ? emailAccountsRes.data : [];
  const openAIConfig = (openAIRes.success && openAIRes.data) ? openAIRes.data : null;
  const jiraLexLatinConfig = (jiraLexLatinRes.success && jiraLexLatinRes.data) ? jiraLexLatinRes.data : null;

  return (
    <ConfiguracionClient 
      initialRoles={roles} 
      initialUsuarios={usuarios} 
      initialIntegraciones={integraciones} 
      initialEmailAccounts={emailAccounts}
      initialOpenAIConfig={openAIConfig}
      initialJiraLexLatinConfig={jiraLexLatinConfig}
    />
  );
}
