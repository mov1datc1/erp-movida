'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, CheckSquare, FileText, Activity } from 'lucide-react';

interface DashboardData {
  periodo_actual: {
    ventas: number;
    ventas_pagadas: number;
    ventas_porcobrar: number;
    utilidad: number;
    tickets: number;
    tickets_pagados: number;
    tickets_porcobrar: number;
    produccion_completadas: number;
    produccion_total: number;
    produccion_porcentaje: number;
  };
  periodo_anterior: {
    ventas: number;
    utilidad: number;
    tickets: number;
    produccion_completadas: number;
    produccion_total: number;
    produccion_porcentaje: number;
  };
  evolucion_diaria: any[];
  fechas: {
    mes_actual: string;
    mes_anterior: string;
    semana_actual: string;
  };
  meta_mensual: number;
}

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

export function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('range') || 'este-mes';
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { periodo_actual: current, periodo_anterior: prev, evolucion_diaria: evolution, fechas, meta_mensual } = data;

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const calcVariation = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const vVentas = calcVariation(current.ventas, prev.ventas);
  const vUtilidad = calcVariation(current.utilidad, prev.utilidad);
  const vTickets = calcVariation(current.tickets, prev.tickets);
  const vProduccion = calcVariation(current.produccion_porcentaje, prev.produccion_porcentaje);

  const VariationPill = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}% vs ant.
      </span>
    );
  };

  const handleRangeChange = (newRange: string) => {
    setIsFilterOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newRange);
    router.push(`/dashboard?${params.toString()}`);
  };

  const filterOptions = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'esta-semana', label: 'Esta semana' },
    { id: 'este-mes', label: 'Este mes' },
    { id: 'mes-pasado', label: 'Mes pasado' },
    { id: '3-meses', label: 'Últimos 3 meses' },
    { id: '6-meses', label: 'Últimos 6 meses' },
    { id: 'este-anio', label: 'Este año' },
    { id: 'anio-pasado', label: 'Año pasado' },
  ];

  const currentLabel = filterOptions.find(o => o.id === currentRange)?.label || 'Este mes';

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER WITH FILTER */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Calendar className="w-5 h-5" />
          Filtro de Fecha:
        </div>
        
        <div className="relative" ref={filterRef}>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2 font-bold outline-none transition-colors"
          >
            {currentLabel}
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleRangeChange(option.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentRange === option.id 
                        ? 'bg-red-50 text-red-700 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 1: VALOR ACTUAL */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full border-4 border-red-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">1. Valor actual ({fechas.mes_actual})</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main KPI */}
          <div className="bg-red-600 rounded-2xl p-6 text-white shadow-lg shadow-red-600/20">
            <p className="text-red-100 text-sm font-bold tracking-wider mb-2 uppercase">Ventas del Mes</p>
            <h3 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">{formatCurrency(current.ventas)}</h3>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${vVentas >= 0 ? 'bg-white/20' : 'bg-black/20'}`}>
                {vVentas >= 0 ? '↑' : '↓'} {Math.abs(vVentas).toFixed(1)}% vs mes anterior
              </span>
            </div>
          </div>

          {/* Evolution Chart (Pagado vs Por Cobrar) */}
          <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Evolución Diaria (Ventas)</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" name="Pagado" dataKey="actual_pagado" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Por Cobrar" dataKey="actual_porcobrar" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 border border-slate-100 rounded-xl bg-white text-center hover:border-red-200 transition-colors">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Ventas</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(current.ventas)}</p>
            <div className="mt-2"><VariationPill value={vVentas} /></div>
          </div>
          <div className="p-4 border border-slate-100 rounded-xl bg-white text-center hover:border-red-200 transition-colors">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Utilidad (Est. 40%)</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(current.utilidad)}</p>
            <div className="mt-2"><VariationPill value={vUtilidad} /></div>
          </div>
          <div className="p-4 border border-slate-100 rounded-xl bg-white text-center hover:border-red-200 transition-colors">
            <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tickets (Prefacturas)</p>
            <p className="text-xl font-black text-slate-800">{formatNumber(current.tickets)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{current.tickets_pagados} pag / {current.tickets_porcobrar} p.c.</p>
            <div className="mt-2"><VariationPill value={vTickets} /></div>
          </div>
          <div className="p-4 border border-slate-100 rounded-xl bg-white text-center hover:border-red-200 transition-colors">
            <CheckSquare className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Producción (Semana)</p>
            <p className="text-xl font-black text-slate-800">{current.produccion_porcentaje}%</p>
            <p className="text-[10px] text-slate-400 mt-1">{current.produccion_completadas} completadas de {current.produccion_total}</p>
            <div className="mt-2"><VariationPill value={vProduccion} /></div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: VARIACIÓN VS ANTERIOR */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full border-4 border-red-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">2. Variación vs periodo anterior</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Periodo Anterior</p>
            <p className="text-3xl font-black text-slate-800">{formatCurrency(prev.ventas)}</p>
            <p className="text-sm font-medium text-slate-400 mt-1">{fechas.mes_anterior}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Periodo Actual</p>
            <p className="text-3xl font-black text-slate-800">{formatCurrency(current.ventas)}</p>
            <p className="text-sm font-medium text-slate-400 mt-1">{fechas.mes_actual}</p>
          </div>
          <div className={`rounded-xl p-5 border ${vVentas >= 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${vVentas >= 0 ? 'text-red-700' : 'text-orange-700'}`}>Variación</p>
            <p className={`text-3xl font-black ${vVentas >= 0 ? 'text-red-600' : 'text-orange-600'}`}>
              {vVentas >= 0 ? '↑' : '↓'} {Math.abs(vVentas).toFixed(1)}%
            </p>
            <p className={`text-sm font-medium mt-1 ${vVentas >= 0 ? 'text-red-500' : 'text-orange-500'}`}>
              {vVentas >= 0 ? '+' : ''}{formatCurrency(current.ventas - prev.ventas)}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CUMPLIMIENTO VS OBJETIVO */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full border-4 border-red-50 flex items-center justify-center">
            <Target className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">3. Cumplimiento vs objetivo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
          <div className="p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resultado Actual</p>
            <p className="text-4xl font-black text-slate-800">{formatCurrency(current.ventas)}</p>
            <p className={`text-sm font-bold mt-2 ${vVentas >= 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {vVentas >= 0 ? '↑' : '↓'} vs anterior {Math.abs(vVentas).toFixed(1)}%
            </p>
          </div>
          <div className="p-4 border-x border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Objetivo (Meta)</p>
            <p className="text-4xl font-black text-slate-800">{formatCurrency(meta_mensual)}</p>
            <p className="text-sm font-bold mt-2 text-slate-400 flex items-center justify-center gap-1">
              <Target className="w-4 h-4" /> Meta del periodo
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cumplimiento</p>
            <p className={`text-4xl font-black ${current.ventas >= meta_mensual ? 'text-red-600' : 'text-orange-500'}`}>
              {((current.ventas / meta_mensual) * 100).toFixed(1)}%
            </p>
            <p className={`text-sm font-bold mt-2 ${current.ventas >= meta_mensual ? 'text-red-500' : 'text-orange-400'}`}>
              {current.ventas >= meta_mensual ? 'Por encima de la meta ↑' : 'Por debajo de la meta ↓'}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Progreso vs Objetivo</p>
          <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-1000"
              style={{ width: `${Math.min((current.ventas / meta_mensual) * 100, 100)}%` }}
            />
            {current.ventas > meta_mensual && (
               <div 
               className="absolute top-0 h-full bg-red-400 transition-all duration-1000"
               style={{ left: '100%', width: `${Math.min(((current.ventas - meta_mensual) / meta_mensual) * 100, 100)}%` }}
             />
            )}
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>0%</span>
            <div className="flex flex-col items-center">
              <span className="h-2 w-px bg-slate-300 mb-1 block"></span>
              <span>100% META</span>
            </div>
            <span className="text-red-600">{((current.ventas / meta_mensual) * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-red-200 flex items-center justify-center bg-white">
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Análisis de Desviación</p>
            <p className="text-2xl font-black text-red-600 mb-1">
              {current.ventas >= meta_mensual ? '+' : '-'}{formatCurrency(Math.abs(current.ventas - meta_mensual))}
            </p>
            <p className="text-sm font-medium text-slate-600">
              El resultado {current.ventas >= meta_mensual ? 'supera' : 'está por debajo de'} la meta en {formatCurrency(Math.abs(current.ventas - meta_mensual))} ({(((current.ventas - meta_mensual) / meta_mensual) * 100).toFixed(1)}%).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
