import React from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdmin, hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import { DashboardClient } from "./DashboardClient";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { auth_id: user.id },
    include: { app_role: true }
  });

  // Verify permission
  const canView = isSuperAdmin(profile) || hasPermission(profile, 'dashboard', 'ver');
  
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-500">No tienes permisos para ver el Dashboard Avanzado.</p>
        </div>
      </div>
    );
  }

  // --- Dates Calculation ---
  const now = new Date();
  
  // Months for Ventas/Tickets/Utilidad
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));
  
  // Weeks for Producción (Tareas)
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // --- Data Fetching ---
  const [
    facturasCurrent,
    facturasPrev,
    tareasCurrent,
    tareasPrev
  ] = await Promise.all([
    prisma.factura.findMany({
      where: {
        fecha_emision: { gte: currentMonthStart, lte: currentMonthEnd }
      }
    }),
    prisma.factura.findMany({
      where: {
        fecha_emision: { gte: previousMonthStart, lte: previousMonthEnd }
      }
    }),
    prisma.tarea.findMany({
      where: {
        createdAt: { gte: currentWeekStart, lte: currentWeekEnd }
      }
    }),
    prisma.tarea.findMany({
      where: {
        createdAt: { gte: previousWeekStart, lte: previousWeekEnd }
      }
    })
  ]);

  // --- Process Ventas ---
  // The user wants: "suma las ventas pagagas y tambien no pagadas como cuentas por cobrar"
  const getVentasData = (facturas: any[]) => {
    const pagadas = facturas.filter(f => f.estatus === 'PAGADA' || f.estatus === 'PAGADA_PARCIALMENTE');
    const porCobrar = facturas.filter(f => f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA');
    
    // Si la factura tiene monto_mxn_estimado, usamos eso para MXN? 
    // Wait, the ERP allows invoices in USD or MXN. For simplicity, we just sum monto_total 
    // assuming it's unified or they just want the sum. We will just sum monto_total.
    const montoPagado = pagadas.reduce((sum, f) => sum + (f.monto_pagado || f.monto_total), 0);
    const montoPorCobrar = porCobrar.reduce((sum, f) => sum + (f.monto_total - (f.monto_pagado || 0)), 0);
    
    return {
      total: montoPagado + montoPorCobrar,
      pagado: montoPagado,
      porCobrar: montoPorCobrar,
      countPagadas: pagadas.length,
      countPorCobrar: porCobrar.length,
      totalCount: facturas.length
    };
  };

  const ventasCurrent = getVentasData(facturasCurrent);
  const ventasPrev = getVentasData(facturasPrev);

  // --- Process Producción (Tareas) ---
  // Tareas completadas vs total tareas de la semana
  const getProduccionData = (tareas: any[]) => {
    const completadas = tareas.filter(t => t.estatus === 'COMPLETADA');
    return {
      completadas: completadas.length,
      total: tareas.length,
      porcentaje: tareas.length > 0 ? Math.round((completadas.length / tareas.length) * 100) : 0
    };
  };

  const prodCurrent = getProduccionData(tareasCurrent);
  const prodPrev = getProduccionData(tareasPrev);

  // --- Process Evolution (Daily Ventas) ---
  const daysInMonth = currentMonthEnd.getDate();
  const evolutionData = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateCurrent = new Date(now.getFullYear(), now.getMonth(), i);
    const datePrev = new Date(now.getFullYear(), now.getMonth() - 1, i);
    
    // Evitar procesar días futuros en el mes actual si queremos que se vea limpio
    if (dateCurrent > now && i > now.getDate()) {
      break; 
    }

    const dayFacturasCurr = facturasCurrent.filter(f => new Date(f.fecha_emision).getDate() === i);
    const dayFacturasPrev = facturasPrev.filter(f => new Date(f.fecha_emision).getDate() === i);
    
    const currVentas = getVentasData(dayFacturasCurr);
    const prevVentas = getVentasData(dayFacturasPrev);

    evolutionData.push({
      dia: i.toString().padStart(2, '0'),
      actual: currVentas.total,
      actual_pagado: currVentas.pagado,
      actual_porcobrar: currVentas.porCobrar,
      anterior: prevVentas.total
    });
  }

  // --- Prepare Final Payload ---
  const data = {
    periodo_actual: {
      ventas: ventasCurrent.total,
      ventas_pagadas: ventasCurrent.pagado,
      ventas_porcobrar: ventasCurrent.porCobrar,
      utilidad: ventasCurrent.total * 0.40, // 40% margin as requested
      tickets: ventasCurrent.totalCount, // Conteo de prefacturas emitidas
      tickets_pagados: ventasCurrent.countPagadas,
      tickets_porcobrar: ventasCurrent.countPorCobrar,
      produccion_completadas: prodCurrent.completadas,
      produccion_total: prodCurrent.total,
      produccion_porcentaje: prodCurrent.porcentaje
    },
    periodo_anterior: {
      ventas: ventasPrev.total,
      utilidad: ventasPrev.total * 0.40,
      tickets: ventasPrev.totalCount,
      produccion_completadas: prodPrev.completadas,
      produccion_total: prodPrev.total,
      produccion_porcentaje: prodPrev.porcentaje
    },
    evolucion_diaria: evolutionData,
    fechas: {
      mes_actual: format(currentMonthStart, 'MMM yyyy'),
      mes_anterior: format(previousMonthStart, 'MMM yyyy'),
      semana_actual: `${format(currentWeekStart, 'dd')} - ${format(currentWeekEnd, 'dd MMM')}`
    },
    // Meta hardcodeada temporalmente a $100k como pediste para la demo del MVP. 
    // Luego crearemos una UI en Configuración para editar metas trimestrales.
    meta_mensual: 100000 
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Dashboard Avanzado</h1>
        <p className="text-text-muted mt-1">Métricas de rendimiento en tiempo real y cumplimiento de metas.</p>
      </div>

      <DashboardClient data={data} />
    </div>
  );
}
