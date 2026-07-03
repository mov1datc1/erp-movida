import React from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdmin, hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, format, startOfDay, endOfDay, subDays, startOfYear, endOfYear, subYears, differenceInDays } from "date-fns";
import { DashboardClient } from "./DashboardClient";

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string, from?: string, to?: string }> }) {
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

  const params = await searchParams;

  // --- Dates Calculation ---
  const now = new Date();
  const range = params.range || 'este-mes';
  
  let currentStart: Date;
  let currentEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (range) {
    case 'hoy':
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      prevStart = startOfDay(subDays(now, 1));
      prevEnd = endOfDay(subDays(now, 1));
      break;
    case 'esta-semana':
      currentStart = startOfWeek(now, { weekStartsOn: 1 });
      currentEnd = endOfWeek(now, { weekStartsOn: 1 });
      prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case 'mes-pasado':
      currentStart = startOfMonth(subMonths(now, 1));
      currentEnd = endOfMonth(subMonths(now, 1));
      prevStart = startOfMonth(subMonths(now, 2));
      prevEnd = endOfMonth(subMonths(now, 2));
      break;
    case '3-meses':
      currentStart = startOfMonth(subMonths(now, 2));
      currentEnd = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 5));
      prevEnd = endOfMonth(subMonths(now, 3));
      break;
    case '6-meses':
      currentStart = startOfMonth(subMonths(now, 5));
      currentEnd = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 11));
      prevEnd = endOfMonth(subMonths(now, 6));
      break;
    case 'este-anio':
      currentStart = startOfYear(now);
      currentEnd = endOfYear(now);
      prevStart = startOfYear(subYears(now, 1));
      prevEnd = endOfYear(subYears(now, 1));
      break;
    case 'anio-pasado':
      currentStart = startOfYear(subYears(now, 1));
      currentEnd = endOfYear(subYears(now, 1));
      prevStart = startOfYear(subYears(now, 2));
      prevEnd = endOfYear(subYears(now, 2));
      break;
    case 'personalizado':
      currentStart = params.from ? startOfDay(new Date(params.from)) : startOfMonth(now);
      currentEnd = params.to ? endOfDay(new Date(params.to)) : endOfMonth(now);
      const diff = differenceInDays(currentEnd, currentStart);
      prevStart = startOfDay(subDays(currentStart, diff + 1));
      prevEnd = endOfDay(subDays(currentEnd, diff + 1));
      break;
    case 'este-mes':
    default:
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
      break;
  }

  // --- Data Fetching ---
  const [
    facturasCurrent,
    facturasPrev,
    tareasCurrent,
    tareasPrev
  ] = await Promise.all([
    prisma.factura.findMany({
      where: {
        fecha_emision: { gte: currentStart, lte: currentEnd }
      }
    }),
    prisma.factura.findMany({
      where: {
        fecha_emision: { gte: prevStart, lte: prevEnd }
      }
    }),
    prisma.tarea.findMany({
      where: {
        createdAt: { gte: currentStart, lte: currentEnd }
      }
    }),
    prisma.tarea.findMany({
      where: {
        createdAt: { gte: prevStart, lte: prevEnd }
      }
    })
  ]);

  // --- Process Ventas ---
  const getVentasData = (facturas: any[]) => {
    const pagadas = facturas.filter(f => f.estatus === 'PAGADA' || f.estatus === 'PAGADA_PARCIALMENTE');
    const porCobrar = facturas.filter(f => f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA');
    
    const getMontoMXN = (f: any, tipo: 'total' | 'pagado') => {
      // Si es USA, usamos monto_mxn_estimado. Si no, usamos monto_total.
      const baseTotal = f.es_usa ? (f.monto_mxn_estimado || (f.monto_total * 18)) : f.monto_total;
      
      if (tipo === 'total') return baseTotal;
      
      if (f.estatus === 'PAGADA') return baseTotal;
      if (f.monto_pagado > 0 && f.monto_total > 0) {
        return (f.monto_pagado / f.monto_total) * baseTotal;
      }
      return 0;
    };

    const montoPagado = pagadas.reduce((sum, f) => sum + getMontoMXN(f, 'pagado'), 0);
    const montoPorCobrar = porCobrar.reduce((sum, f) => sum + (getMontoMXN(f, 'total') - getMontoMXN(f, 'pagado')), 0);
    
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

  // --- Process Evolution (Daily/Monthly Ventas) ---
  const evolutionData = [];
  const daysDiff = differenceInDays(currentEnd, currentStart);
  
  if (daysDiff > 60) {
    // Para rangos mayores a 2 meses, mostramos meses en lugar de días
    for (let i = 0; i < 12; i++) {
      const iterMonthStart = startOfMonth(new Date(currentStart.getFullYear(), currentStart.getMonth() + i, 1));
      if (iterMonthStart > currentEnd) break;
      
      const iterMonthEnd = endOfMonth(iterMonthStart);
      
      const monthFacturasCurr = facturasCurrent.filter(f => new Date(f.fecha_emision) >= iterMonthStart && new Date(f.fecha_emision) <= iterMonthEnd);
      const currVentas = getVentasData(monthFacturasCurr);
      
      evolutionData.push({
        dia: format(iterMonthStart, 'MMM'),
        actual: currVentas.total,
        actual_pagado: currVentas.pagado,
        actual_porcobrar: currVentas.porCobrar,
      });
    }
  } else {
    // Rango de días
    for (let i = 0; i <= daysDiff; i++) {
      const iterDate = new Date(currentStart);
      iterDate.setDate(iterDate.getDate() + i);
      
      if (iterDate > now && iterDate.getDate() !== now.getDate()) continue;
      
      const dayFacturasCurr = facturasCurrent.filter(f => new Date(f.fecha_emision).getDate() === iterDate.getDate() && new Date(f.fecha_emision).getMonth() === iterDate.getMonth());
      const currVentas = getVentasData(dayFacturasCurr);
      
      evolutionData.push({
        dia: format(iterDate, 'dd MMM'),
        actual: currVentas.total,
        actual_pagado: currVentas.pagado,
        actual_porcobrar: currVentas.porCobrar,
      });
    }
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
      mes_actual: `${format(currentStart, 'dd MMM yy')} - ${format(currentEnd, 'dd MMM yy')}`,
      mes_anterior: `${format(prevStart, 'dd MMM yy')} - ${format(prevEnd, 'dd MMM yy')}`,
      semana_actual: `${format(currentStart, 'dd')} - ${format(currentEnd, 'dd MMM')}`
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
