import React from "react";
import { TrendingUp, Users, CheckCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdmin } from "@/lib/rbac";

export const dynamic = 'force-dynamic';

export default async function Home() {
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

  // Fetch data from Prisma concurrently (only if superAdmin, to save DB calls)
  let statsData = null;
  
  if (superAdmin) {
    const [
      proyectosActivos,
      tareasPendientes,
      movimientosMes,
      tareasRecientes
    ] = await Promise.all([
      prisma.proyecto.count({
        where: { estado: 'ACTIVO' }
      }),
      prisma.tarea.count({
        where: { estatus: 'PENDIENTE' }
      }),
      prisma.movimientoFinanciero.findMany({
        where: {
          fecha: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.tarea.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const ingresosMes = movimientosMes
      .filter(m => m.sentido === 'INGRESO')
      .reduce((acc, curr) => acc + curr.monto, 0);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    statsData = {
      proyectosActivos,
      tareasPendientes,
      ingresosMes: formatCurrency(ingresosMes),
      movimientosCount: movimientosMes.length,
      tareasRecientes
    };
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Bienvenido a Movida ERP</h1>
        {superAdmin && (
          <p className="text-text-muted mt-1">Aquí está el resumen de tu negocio el día de hoy.</p>
        )}
      </div>

      {!superAdmin && (
        <div className="bg-surface rounded-2xl p-8 card-shadow border border-slate-100 flex flex-col items-center justify-center min-h-[40vh] text-center">
          <img src="/logo.png" alt="Movida ERP" className="h-24 w-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Hola, {profile?.nombre || 'Usuario'}!</h2>
          <p className="text-slate-500 max-w-md">
            Selecciona un módulo en el menú lateral izquierdo para comenzar a trabajar. Si necesitas acceso a algún módulo adicional, contacta a un administrador.
          </p>
        </div>
      )}

      {superAdmin && statsData && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface rounded-2xl p-6 card-shadow border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-text-muted">Proyectos Activos</p>
                  <h3 className="text-3xl font-bold text-text-main mt-2">{statsData.proyectosActivos}</h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-primary-light" />
                </div>
              </div>
              <div className="mt-4 text-xs font-medium text-success">
                En progreso
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 card-shadow border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-text-muted">Tareas Pendientes</p>
                  <h3 className="text-3xl font-bold text-text-main mt-2">{statsData.tareasPendientes}</h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 text-xs font-medium text-success">
                Requieren atención
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 card-shadow border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-text-muted">Ingresos del Mes</p>
                  <h3 className="text-3xl font-bold text-text-main mt-2">{statsData.ingresosMes}</h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="mt-4 text-xs font-medium text-success">
                Mes actual
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 card-shadow border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-text-muted">Movimientos</p>
                  <h3 className="text-3xl font-bold text-text-main mt-2">{statsData.movimientosCount}</h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 text-xs font-medium text-success">
                Registrados este mes
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Chart/Main Data) */}
            <div className="lg:col-span-2 bg-primary rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">Resumen Financiero</h2>
                <p className="text-primary-light mb-8">El flujo de caja se mantiene activo este mes.</p>
                
                <div className="h-48 flex items-end gap-4">
                  {/* Dummy Chart Bars for now, could be wired to actual daily/weekly data later */}
                  {[40, 70, 45, 90, 65, 85].map((height, i) => (
                    <div key={i} className="flex-1 bg-white/20 hover:bg-white/40 transition-colors rounded-t-lg" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
              {/* Abstract background shapes */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-primary-light/20 blur-3xl"></div>
            </div>

            {/* Right Column (Tasks) */}
            <div className="bg-surface rounded-3xl p-6 card-shadow border border-slate-100">
              <h3 className="text-lg font-bold text-text-main mb-4">Tareas Recientes</h3>
              <div className="space-y-4">
                {statsData.tareasRecientes.length > 0 ? (
                  statsData.tareasRecientes.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${task.estatus === 'COMPLETADA' ? 'bg-success' : task.estatus === 'PENDIENTE' ? 'bg-orange-500' : 'bg-primary-light'}`}></div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-text-main truncate">{task.descripcion}</p>
                        <p className="text-xs text-text-muted">{format(task.createdAt, 'dd MMM, HH:mm', { locale: es })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted text-center py-4">No hay tareas recientes.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
