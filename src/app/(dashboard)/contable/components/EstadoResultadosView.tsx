'use client';

import React, { useMemo } from 'react';
import { MovimientoFinanciero } from '@prisma/client';

interface EstadoResultadosViewProps {
  movimientos: MovimientoFinanciero[];
  anio: string;
  mes: string;
}

export function EstadoResultadosView({ movimientos, anio, mes }: EstadoResultadosViewProps) {

  const data = useMemo(() => {
    let filtrados = movimientos.filter(m => {
      const d = new Date(m.fecha);
      const yearMatch = d.getFullYear().toString() === anio;
      const monthMatch = mes === '' || (d.getMonth() + 1).toString() === mes;
      return yearMatch && monthMatch;
    });

    const ingresos = filtrados.filter(m => m.sentido === 'INGRESO');
    const egresos = filtrados.filter(m => m.sentido === 'EGRESO');

    // Categorización inteligente basada en el requerimiento de agregar valor.
    // Ingresos Operativos: Ventas, Servicios
    // Otros Ingresos: Otros
    const ingresosOperativos = ingresos.filter(m => ['Ventas', 'Servicios'].includes(m.categoria_ingreso || ''));
    const otrosIngresos = ingresos.filter(m => !['Ventas', 'Servicios'].includes(m.categoria_ingreso || ''));

    // Costo Directo: Podrían ser gastos de "Servicios" o "Compras Directas" (no tenemos categoría compras directas por defecto, usamos algunas heurísticas o asumimos 0 si no hay)
    const costoDirecto = egresos.filter(m => ['Costo de Ventas', 'Compras'].includes(m.categoria_egreso || ''));
    
    // Gastos Operativos: Nomina, Servicios (Luz, Internet), Software
    const gastosOperativos = egresos.filter(m => ['Nomina', 'Servicios', 'Software'].includes(m.categoria_egreso || ''));
    
    const impuestos = egresos.filter(m => m.categoria_egreso === 'Impuestos');
    const otrosEgresos = egresos.filter(m => !['Costo de Ventas', 'Compras', 'Nomina', 'Servicios', 'Software', 'Impuestos'].includes(m.categoria_egreso || ''));

    const totalIngresosOperativos = ingresosOperativos.reduce((acc, m) => acc + m.monto, 0);
    const totalOtrosIngresos = otrosIngresos.reduce((acc, m) => acc + m.monto, 0);
    const totalCostoDirecto = costoDirecto.reduce((acc, m) => acc + m.monto, 0);
    const totalGastosOperativos = gastosOperativos.reduce((acc, m) => acc + m.monto, 0);
    const totalImpuestos = impuestos.reduce((acc, m) => acc + m.monto, 0);
    const totalOtrosEgresos = otrosEgresos.reduce((acc, m) => acc + m.monto, 0);

    const utilidadBruta = totalIngresosOperativos - totalCostoDirecto;
    const ebitda = utilidadBruta - totalGastosOperativos;
    const utilidadAntesImpuestos = ebitda + totalOtrosIngresos - totalOtrosEgresos;
    const utilidadNeta = utilidadAntesImpuestos - totalImpuestos;

    // Margen Neto (Utilidad Neta / Total Ingresos)
    const margenNeto = totalIngresosOperativos > 0 ? (utilidadNeta / totalIngresosOperativos) * 100 : 0;

    return {
      totalIngresosOperativos,
      totalCostoDirecto,
      utilidadBruta,
      totalGastosOperativos,
      ebitda,
      totalOtrosIngresos,
      totalOtrosEgresos,
      utilidadAntesImpuestos,
      totalImpuestos,
      utilidadNeta,
      margenNeto
    };
  }, [movimientos, anio, mes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium text-sm">Ingresos Operativos</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.totalIngresosOperativos)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 font-medium text-sm">EBITDA</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.ebitda)}</h3>
        </div>
        <div className={`p-6 rounded-2xl shadow-sm border ${data.utilidadNeta >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
          <p className={`font-medium text-sm ${data.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}`}>Utilidad Neta</p>
          <h3 className={`text-2xl font-bold mt-1 ${data.utilidadNeta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(data.utilidadNeta)}
          </h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700">
          <p className="text-slate-300 font-medium text-sm">Margen Neto</p>
          <h3 className="text-2xl font-bold text-white mt-1">{data.margenNeto.toFixed(2)}%</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Estado de Resultados Consolidado</h3>
        </div>
        <div className="p-2">
          {[
            { label: 'Ingresos Operativos', value: data.totalIngresosOperativos, variant: 'header' },
            { label: 'Costo Directo', value: data.totalCostoDirecto, variant: 'negative' },
            { label: 'Utilidad Bruta', value: data.utilidadBruta, variant: 'subtotal' },
            { label: 'Gastos Operativos', value: data.totalGastosOperativos, variant: 'negative' },
            { label: 'EBITDA (Utilidad Operativa)', value: data.ebitda, variant: 'subtotal' },
            { label: 'Otros Ingresos', value: data.totalOtrosIngresos, variant: 'positive' },
            { label: 'Otros Egresos', value: data.totalOtrosEgresos, variant: 'negative' },
            { label: 'Utilidad Antes de Impuestos', value: data.utilidadAntesImpuestos, variant: 'subtotal' },
            { label: 'Impuestos del Período', value: data.totalImpuestos, variant: 'negative' },
            { label: 'Utilidad Neta', value: data.utilidadNeta, variant: 'final' }
          ].map((row, idx) => (
            <div 
              key={idx} 
              className={`flex justify-between items-center p-4 rounded-xl mx-2 my-1 transition-colors ${
                row.variant === 'header' ? 'bg-slate-100 font-semibold text-slate-700' :
                row.variant === 'subtotal' ? 'bg-slate-50 font-bold text-slate-800' :
                row.variant === 'final' ? 'bg-primary/10 font-bold text-primary text-lg' :
                'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {row.variant === 'negative' && <span className="text-danger font-bold">-</span>}
                {row.variant === 'positive' && <span className="text-success font-bold">+</span>}
                {row.variant === 'final' && <span className="text-primary font-bold">=</span>}
                {row.label}
              </span>
              <span className={`font-mono ${row.variant === 'final' ? 'text-primary' : ''}`}>
                {formatCurrency(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
