'use client';

import React, { useMemo } from 'react';
import { TrendingUp, Target, CreditCard, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays, isAfter, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface KpiSemanalesViewProps {
  rawMovimientos: any[];
  facturasPendientes: any[];
  oportunidadesMes: any[];
}

export function KpiSemanalesView({ rawMovimientos, facturasPendientes, oportunidadesMes }: KpiSemanalesViewProps) {
  
  const { cashFlow, marginPorLinea, cuentasPorCobrar, conversion } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    
    // 1. Cash (Weekly Flow & Starting Balance)
    const movsBeforeWeek = rawMovimientos.filter(m => {
      const d = new Date(m.fecha);
      return !isAfter(d, start); // Before the start of this week
    });
    
    const movsThisWeek = rawMovimientos.filter(m => {
      const d = new Date(m.fecha);
      return isAfter(d, start) && !isAfter(d, end);
    });

    const startingIngresos = movsBeforeWeek.filter(m => m.sentido === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0);
    const startingEgresos = movsBeforeWeek.filter(m => m.sentido === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0);
    const saldoInicial = startingIngresos - startingEgresos;

    const ingresosSemana = movsThisWeek.filter(m => m.sentido === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0);
    const egresosSemana = movsThisWeek.filter(m => m.sentido === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0);
    const cashNeto = saldoInicial + ingresosSemana - egresosSemana;

    // 2. Margen por línea (Only ingresos linked to a line this week)
    const lineasMap = new Map<string, { nombre: string, monto: number }>();
    movsThisWeek.forEach(m => {
      if (m.sentido === 'INGRESO' && m.linea_producto) {
        const linea = m.linea_producto;
        if (!lineasMap.has(linea.id)) {
          lineasMap.set(linea.id, { nombre: linea.nombre, monto: 0 });
        }
        lineasMap.get(linea.id)!.monto += m.monto;
      }
    });
    
    const marginPorLineaData = Array.from(lineasMap.values()).sort((a, b) => b.monto - a.monto);

    // 3. Cuentas por cobrar (Facturas PENDIENTE)
    const totalPendiente = facturasPendientes.reduce((acc, curr) => acc + curr.monto_total, 0);
    const totalFacturas = facturasPendientes.length;

    // 4. Conversión Lead (Oportunidades ganadas vs totales activas este mes)
    const wonThisMonth = oportunidadesMes.filter(o => o.etapa === 'GANADO').length;
    const totalThisMonth = oportunidadesMes.length;
    const conversionRate = totalThisMonth > 0 ? (wonThisMonth / totalThisMonth) * 100 : 0;

    return {
      cashFlow: { ingresos: ingresosSemana, egresos: egresosSemana, neto: cashNeto, inicial: saldoInicial },
      marginPorLinea: marginPorLineaData,
      cuentasPorCobrar: { total: totalPendiente, count: totalFacturas },
      conversion: { rate: conversionRate, won: wonThisMonth, total: totalThisMonth }
    };
  }, [rawMovimientos, facturasPendientes, oportunidadesMes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Cash Flow */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">Esta Semana</span>
            </div>
            <p className="text-blue-100 font-medium text-sm">Flujo Neto Disponible</p>
            <h3 className="text-3xl font-bold mt-1 tracking-tight">{formatCurrency(cashFlow.neto)}</h3>
            <p className="text-xs text-blue-200 mt-1">Saldo inicial semana: {formatCurrency(cashFlow.inicial)}</p>
            <div className="mt-4 flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1" title="Ingresos en la semana">
                <ArrowUpRight className="w-3.5 h-3.5 text-green-300" />
                <span className="text-green-100">{formatCurrency(cashFlow.ingresos)}</span>
              </div>
              <div className="flex items-center gap-1" title="Egresos en la semana">
                <ArrowDownRight className="w-3.5 h-3.5 text-red-300" />
                <span className="text-red-100">{formatCurrency(cashFlow.egresos)}</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>

        {/* KPI 2: Margen por Línea */}
        <div className="bg-surface rounded-3xl p-6 border border-slate-100 card-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm">Mejor Línea (Semana)</p>
          {marginPorLinea.length > 0 ? (
            <>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 truncate">{marginPorLinea[0].nombre}</h3>
              <p className="text-success font-bold mt-2">{formatCurrency(marginPorLinea[0].monto)}</p>
            </>
          ) : (
            <div className="mt-2 text-slate-400 text-sm">Sin ingresos registrados esta semana por línea.</div>
          )}
        </div>

        {/* KPI 3: Conversión Lead */}
        <div className="bg-surface rounded-3xl p-6 border border-slate-100 card-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Este Mes</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Conversión Lead (Mensual)</p>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{conversion.rate.toFixed(1)}%</h3>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-3">
            <span className="text-slate-600">{conversion.won}</span> cerradas de <span className="text-slate-600">{conversion.total}</span> activas (Mes actual)
          </p>
        </div>

        {/* KPI 4: Anticipos / Cuentas por Cobrar */}
        <div className="bg-surface rounded-3xl p-6 border border-slate-100 card-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm relative z-10">Cuentas por Cobrar</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1 tracking-tight relative z-10">{formatCurrency(cuentasPorCobrar.total)}</h3>
          <p className="text-xs font-medium text-orange-500 mt-3 relative z-10">
            En {cuentasPorCobrar.count} pre-facturas/facturas
          </p>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <CreditCard className="w-24 h-24" />
          </div>
        </div>

      </div>
      
      {/* Detalle Margen por Línea List */}
      <div className="bg-surface rounded-3xl border border-slate-100 card-shadow p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Desglose de Ingresos por Línea de Producto (Semana Actual)</h3>
        
        {marginPorLinea.length > 0 ? (
          <div className="space-y-4">
            {marginPorLinea.map((linea, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-400 border border-slate-100">
                    {index + 1}
                  </div>
                  <h4 className="font-semibold text-slate-800">{linea.nombre}</h4>
                </div>
                <div className="text-right">
                  <span className="font-bold text-success">{formatCurrency(linea.monto)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            <TrendingUp className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            No hay ingresos asociados a líneas de productos esta semana.
          </div>
        )}
      </div>

    </div>
  );
}
