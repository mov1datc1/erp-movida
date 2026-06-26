import React from "react";
import { getLineasProductos } from "./actions";
import { LineasClient } from "./LineasClient";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function LineasProductosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true }
  });

  const canView = hasPermission(profile, 'lineas-productos', 'ver');
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
        <p className="text-slate-500 max-w-md">No tienes permisos para ver el catálogo de líneas y productos.</p>
      </div>
    );
  }

  const result = await getLineasProductos();
  const lineas = result.success ? result.lineas : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Catálogo de Servicios y Productos</h1>
        <p className="text-text-muted mt-1">Administra las líneas de negocio y los servicios específicos para tus cotizaciones.</p>
      </div>

      <LineasClient initialLineas={lineas as any[]} />
    </div>
  );
}
