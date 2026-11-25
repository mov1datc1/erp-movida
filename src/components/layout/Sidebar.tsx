import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, getVisibleModules, ALL_MODULES } from '@/lib/rbac';
import type { SidebarMenuItem, SidebarUserInfo } from './DashboardShell';

const MODULE_META: Record<string, Omit<SidebarMenuItem, 'id'>> = {
  inicio: { name: 'Inicio', path: '/', group: 'principal' },
  dashboard: { name: 'Dashboard', path: '/dashboard', group: 'principal' },
  tareas: { name: 'Tareas', path: '/tareas', group: 'operaciones' },
  recordatorios: { name: 'Recordatorios', path: '/recordatorios', group: 'operaciones' },
  proyectos: { name: 'Proyectos', path: '/proyectos', group: 'operaciones' },
  'soporte-lexlatin': { name: 'Soporte LexLatin', path: '/soporte-lexlatin', group: 'operaciones' },
  crm: { name: 'CRM / Clientes', path: '/crm/clientes', group: 'comercial' },
  oportunidades: { name: 'Oportunidades', path: '/crm/oportunidades', group: 'comercial' },
  cotizaciones: { name: 'Cotizaciones', path: '/crm/cotizaciones', group: 'comercial' },
  'lineas-productos': { name: 'Catálogo', path: '/lineas-productos', group: 'comercial' },
  contable: { name: 'Contable', path: '/contable', group: 'finanzas' },
  facturacion: { name: 'Facturación', path: '/crm/facturacion', group: 'finanzas' },
  'cuentas-por-pagar': { name: 'Cuentas por Pagar', path: '/cuentas-por-pagar', group: 'finanzas' },
};

export async function getSidebarData(): Promise<{
  menuItems: SidebarMenuItem[];
  userInfo: SidebarUserInfo;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    profile = await prisma.profile.findUnique({
      where: { auth_id: user.id },
      include: { app_role: true },
    });
  }

  const superAdmin = isSuperAdmin(profile);
  const visibleModuleIds = getVisibleModules(profile);

  const menuItems: SidebarMenuItem[] = ALL_MODULES.filter(
    (mod) => mod.id !== 'configuracion' && visibleModuleIds.includes(mod.id)
  ).map((mod) => {
    const meta = MODULE_META[mod.id] || {
      name: mod.label,
      path: `/${mod.id}`,
      group: 'operaciones' as const,
    };
    return { id: mod.id, ...meta };
  });

  const nombre = profile?.nombre || 'Usuario';
  const email = user?.email || 'admin@movidatci.mx';
  const initials = (profile?.nombre || user?.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  return {
    menuItems,
    userInfo: {
      nombre,
      email,
      initials,
      superAdmin,
    },
  };
}
