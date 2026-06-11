'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { MovimientoFinanciero } from '@prisma/client';

interface FlujoCajaViewProps {
  movimientos: MovimientoFinanciero[];
}

export function FlujoCajaView({ movimientos }: FlujoCajaViewProps) {
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString());

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const data = useMemo(() => {
    let filtrados = movimientos.filter(m => {
      const d = new Date(m.fecha);
      const yearMatch = d.getFullYear().toString() === anio;
      const monthMatch = mes === '' || (d.getMonth() + 1).toString() === mes;
      return yearMatch && monthMatch;
    });

    let filtradosAnterior = movimientos.filter(m => {
      const d = new Date(m.fecha);
      if (mes === '') {
        return d.getFullYear().toString() === (parseInt(anio) - 1).toString();
      } else {
        const prevMonthDate = new Date(parseInt(anio), parseInt(mes) - 2, 1);
        return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
      }
    });

    const ingresos = filtrados.filter(m => m.sentido === 'INGRESO');
    const egresos = filtrados.filter(m => m.sentido === 'EGRESO');
    
    const totalIngresos = ingresos.reduce((acc, m) => acc + m.monto, 0);
    const totalEgresos = egresos.reduce((acc, m) => acc + m.monto, 0);
    const balance = totalIngresos - totalEgresos;

    const balanceAnterior = filtradosAnterior.reduce((acc, m) => {
      return m.sentido === 'INGRESO' ? acc + m.monto : acc - m.monto;
    }, 0);

    const diferencia = balance - balanceAnterior;

    const breakdownIngresos = ingresos.reduce((acc, m) => {
      const cat = m.categoria_ingreso || 'Sin Categoría';
      acc[cat] = (acc[cat] || 0) + m.monto;
      return acc;
    }, {} as Record<string, number>);

    const breakdownEgresos = egresos.reduce((acc, m) => {
      const cat = m.categoria_egreso || 'Sin Categoría';
      acc[cat] = (acc[cat] || 0) + m.monto;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIngresos,
      totalEgresos,
      balance,
      balanceAnterior,
      diferencia,
      breakdownIngresos: Object.entries(breakdownIngresos).map(([categoria, total]) => ({ categoria, total })).sort((a,b) => b.total - a.total),
      breakdownEgresos: Object.entries(breakdownEgresos).map(([categoria, total]) => ({ categoria, total })).sort((a,b) => b.total - a.total)
    };
  }, [movimientos, anio, mes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Filtros</h2>
        </div>
        <div className="flex gap-3">
          <select
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-700 bg-slate-50"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-700 bg-slate-50"
          >
            <option value="">Todo el año</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-600 p-6 rounded-2xl shadow-lg border border-emerald-300/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 font-medium text-sm">Ingresos del período</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.totalIngresos)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-emerald-50/90 text-xs mt-4">Todas las entradas registradas</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 via-rose-400 to-rose-600 p-6 rounded-2xl shadow-lg border border-rose-300/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-100 font-medium text-sm">Egresos del período</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.totalEgresos)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-rose-50/90 text-xs mt-4">Gastos operativos y no operativos</p>
        </div>

        <div className="bg-gradient-to-br from-sky-500 via-sky-400 to-blue-600 p-6 rounded-2xl shadow-lg border border-sky-300/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sky-100 font-medium text-sm">Balance del período</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.balance)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-sky-50/90 text-xs mt-4">Ingresos - Egresos</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 via-indigo-400 to-violet-600 p-6 rounded-2xl shadow-lg border border-indigo-300/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 font-medium text-sm">Variación anterior</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {data.diferencia > 0 ? '+' : ''}{formatCurrency(data.diferencia)}
              </h3>
            </div>
          </div>
          <p className="text-indigo-50/90 text-xs mt-4">Balance anterior: {formatCurrency(data.balanceAnterior)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Detalle de Ingresos</h3>
          </div>
          <div className="p-5">
            {data.breakdownIngresos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin ingresos registrados</p>
            ) : (
              <div className="space-y-4">
                {data.breakdownIngresos.map(item => (
                  <div key={item.categoria} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">{item.categoria}</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Detalle de Egresos</h3>
          </div>
          <div className="p-5">
            {data.breakdownEgresos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin egresos registrados</p>
            ) : (
              <div className="space-y-4">
                {data.breakdownEgresos.map(item => (
                  <div key={item.categoria} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">{item.categoria}</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
