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
    const now = new Date();
    // Get the first day of the month 5 months ago
    const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      proyectosActivos,
      tareasPendientes,
      movimientosSeisMeses,
      tareasRecientes
    ] = await Promise.all([
      prisma.proyecto.count({
        where: { estado: { in: ['ACTIVO', 'PLANIFICACION'] } }
      }),
      prisma.tarea.count({
        where: { estatus: 'PENDIENTE' }
      }),
      prisma.movimientoFinanciero.findMany({
        where: {
          fecha: {
            gte: sixMonthsAgoStart
          }
        }
      }),
      prisma.tarea.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const movimientosMesActual = movimientosSeisMeses.filter(m => m.fecha >= currentMonthStart);

    const ingresosMes = movimientosMesActual
      .filter(m => m.sentido === 'INGRESO')
      .reduce((acc, curr) => acc + curr.monto, 0);

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthIngresos = movimientosSeisMeses
        .filter(m => m.fecha >= monthStart && m.fecha < nextMonthStart && m.sentido === 'INGRESO')
        .reduce((acc, curr) => acc + curr.monto, 0);
        
      chartData.push({
        label: format(monthStart, 'MMM', { locale: es }),
        ingresos: monthIngresos
      });
    }

    const maxIngreso = Math.max(...chartData.map(d => d.ingresos), 1);
    const chartHeights = chartData.map(d => Math.round((d.ingresos / maxIngreso) * 100));
    const chartLabels = chartData.map(d => d.label);

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    statsData = {
      proyectosActivos,
      tareasPendientes,
      ingresosMes: formatCurrency(ingresosMes),
      movimientosCount: movimientosMesActual.length,
      tareasRecientes,
      chartHeights,
      chartLabels
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
                
                <div className="h-52 flex items-end gap-4 mt-6">
                  {statsData.chartHeights.map((height: number, i: number) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full group">
                      <div className="w-full flex-1 flex flex-col justify-end relative">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-primary text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                          {statsData.chartLabels[i]}
                        </div>
                        <div className="w-full bg-white/20 group-hover:bg-white/40 transition-all duration-300 rounded-t-lg" style={{ height: `${Math.max(height, 2)}%` }}></div>
                      </div>
                      <div className="text-center mt-2 text-xs text-white/60 font-medium capitalize">{statsData.chartLabels[i]}</div>
                    </div>
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
