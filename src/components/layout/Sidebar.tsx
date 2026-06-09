import React from "react";
import Link from "next/link";
import { 
  Home, 
  CheckSquare, 
  Briefcase, 
  DollarSign, 
  PieChart, 
  Settings,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { name: "Inicio", icon: <Home className="w-5 h-5" />, path: "/" },
    { name: "Tareas", icon: <CheckSquare className="w-5 h-5" />, path: "/tareas" },
    { name: "Proyectos", icon: <Briefcase className="w-5 h-5" />, path: "/proyectos" },
    { name: "Contable", icon: <DollarSign className="w-5 h-5" />, path: "/contable" },
    { name: "CRM / Clientes", icon: <PieChart className="w-5 h-5" />, path: "/crm/clientes" },
    { name: "Oportunidades", icon: <Briefcase className="w-5 h-5" />, path: "/crm/oportunidades" },
    { name: "Cotizaciones", icon: <PieChart className="w-5 h-5" />, path: "/crm/cotizaciones" },
    { name: "Facturación", icon: <DollarSign className="w-5 h-5" />, path: "/crm/facturacion" },
  ];

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
        <Link 
          href="/configuracion"
          className="flex items-center gap-3 px-4 py-3 text-text-muted hover:bg-slate-50 hover:text-primary rounded-xl transition-colors font-medium"
        >
          <Settings className="w-5 h-5" />
          Configuración
        </Link>
        
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-text-main truncate">Usuario</p>
            <p className="text-xs text-text-muted truncate">admin@movida.com</p>
          </div>
          <button className="ml-auto text-slate-400 hover:text-danger transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
