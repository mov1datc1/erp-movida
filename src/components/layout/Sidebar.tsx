import React from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { 
  Home, 
  CheckSquare, 
  Briefcase, 
  DollarSign, 
  PieChart, 
  Settings,
  LogOut
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
  const allMenuItems = [
    { id: "inicio", name: "Inicio", icon: <Home className="w-5 h-5" />, path: "/" },
    { id: "tareas", name: "Tareas", icon: <CheckSquare className="w-5 h-5" />, path: "/tareas" },
    { id: "proyectos", name: "Proyectos", icon: <Briefcase className="w-5 h-5" />, path: "/proyectos" },
    { id: "contable", name: "Contable", icon: <DollarSign className="w-5 h-5" />, path: "/contable" },
    { id: "crm", name: "CRM / Clientes", icon: <PieChart className="w-5 h-5" />, path: "/crm/clientes" },
    { id: "oportunidades", name: "Oportunidades", icon: <Briefcase className="w-5 h-5" />, path: "/crm/oportunidades" },
    { id: "cotizaciones", name: "Cotizaciones", icon: <PieChart className="w-5 h-5" />, path: "/crm/cotizaciones" },
    { id: "facturacion", name: "Facturación", icon: <DollarSign className="w-5 h-5" />, path: "/crm/facturacion" },
  ];

  // Parse permissions from JSON if available
  let permisos: string[] = [];
  if (profile?.app_role?.permisos) {
    try {
      permisos = Array.isArray(profile.app_role.permisos) 
        ? profile.app_role.permisos 
        : JSON.parse(profile.app_role.permisos as string);
    } catch (e) {
      permisos = [];
    }
  }

  const isSuperAdmin = profile?.rol === 'ADMIN';

  const menuItems = allMenuItems.filter(item => {
    if (isSuperAdmin) return true;
    return permisos.includes(item.id);
  });

  return (
    <aside className="w-64 bg-surface h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.png" alt="Movida TCI" className="h-8 w-auto object-contain" />
        <span className="font-bold text-xl text-primary">Movida ERP</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
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

      <div className="p-4 border-t border-slate-100">
        {isSuperAdmin && (
          <Link 
            href="/configuracion"
            className="flex items-center gap-3 px-4 py-3 text-text-muted hover:bg-slate-50 hover:text-primary rounded-xl transition-colors font-medium"
          >
            <Settings className="w-5 h-5" />
            Configuración
          </Link>
        )}
        
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center text-slate-500 font-bold">
            {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-text-main truncate">{profile?.nombre || 'Usuario'}</p>
            <p className="text-xs text-text-muted truncate">{user?.email || 'admin@movida.com'}</p>
          </div>
          <form action={logout} className="ml-auto">
            <button type="submit" className="text-slate-400 hover:text-danger transition-colors cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
