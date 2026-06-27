import React from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, getVisibleModules, ALL_MODULES } from "@/lib/rbac";
import { 
  Home, 
  CheckSquare, 
  Briefcase, 
  DollarSign, 
  PieChart, 
  Settings,
  LogOut,
  Target,
  PackageSearch
} from "lucide-react";

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    profile = await prisma.profile.findUnique({
      where: { auth_id: user.id },
      include: { app_role: true }
    });
  }

  const superAdmin = isSuperAdmin(profile);
  const visibleModuleIds = getVisibleModules(profile);

  // Mapeamos los IDs de módulos a sus rutas e íconos correspondientes
  const moduleConfig = {
    'inicio': { name: "Inicio", icon: <Home className="w-5 h-5" />, path: "/" },
    'tareas': { name: "Tareas", icon: <CheckSquare className="w-5 h-5" />, path: "/tareas" },
    'proyectos': { name: "Proyectos", icon: <Briefcase className="w-5 h-5" />, path: "/proyectos" },
    'contable': { name: "Contable", icon: <DollarSign className="w-5 h-5" />, path: "/contable" },
    'crm': { name: "CRM / Clientes", icon: <PieChart className="w-5 h-5" />, path: "/crm/clientes" },
    'oportunidades': { name: "Oportunidades", icon: <Target className="w-5 h-5" />, path: "/crm/oportunidades" },
    'cotizaciones': { name: "Cotizaciones", icon: <PieChart className="w-5 h-5" />, path: "/crm/cotizaciones" },
    'facturacion': { name: "Facturación", icon: <DollarSign className="w-5 h-5" />, path: "/crm/facturacion" },
    'cuentas-por-pagar': { name: "Cuentas por Pagar", icon: <DollarSign className="w-5 h-5" />, path: "/cuentas-por-pagar" },
    'lineas-productos': { name: "Catálogo", icon: <PackageSearch className="w-5 h-5" />, path: "/lineas-productos" },
  } as Record<string, any>;

  // Construir los items del menú basados en los módulos visibles
  const menuItems = ALL_MODULES
    .filter(mod => mod.id !== 'configuracion' && visibleModuleIds.includes(mod.id))
    .map(mod => ({
      id: mod.id,
      ...(moduleConfig[mod.id] || { name: mod.label, icon: <Briefcase className="w-5 h-5" />, path: `/${mod.id}` })
    }));

  return (
    <aside className="w-64 bg-surface h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0 print:hidden">
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.png" alt="Movida TCI" className="h-8 w-auto object-contain" />
        <span className="font-bold text-xl text-primary">Movida ERP</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            href={item.path}
            className="flex items-center gap-3 px-4 py-3 text-text-muted hover:bg-slate-50 hover:text-primary rounded-xl transition-colors font-medium"
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 flex-shrink-0">
        {superAdmin && (
          <Link 
            href="/configuracion"
            className="flex items-center gap-3 px-4 py-3 text-text-muted hover:bg-slate-50 hover:text-primary rounded-xl transition-colors font-medium"
          >
            <Settings className="w-5 h-5" />
            Configuración
          </Link>
        )}
        
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${superAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-text-main truncate">{profile?.nombre || 'Usuario'}</p>
            <p className="text-xs text-text-muted truncate">{user?.email || 'admin@movida.com'}</p>
          </div>
          <form action={logout} className="ml-auto">
            <button type="submit" className="text-slate-400 hover:text-danger transition-colors cursor-pointer" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
