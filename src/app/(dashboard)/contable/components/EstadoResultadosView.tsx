'use client';

import React, { useMemo } from 'react';
import { MovimientoFinanciero } from '@prisma/client';
import { Download } from 'lucide-react';

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
    // Ingresos Operativos
    const ingresosOperativos = ingresos.filter(m => ['Ventas y Servicios', 'Ventas', 'Servicios', 'Comisiones'].includes(m.categoria_ingreso || ''));
    const otrosIngresos = ingresos.filter(m => !['Ventas y Servicios', 'Ventas', 'Servicios', 'Comisiones'].includes(m.categoria_ingreso || ''));

    // Costo Directo
    const costoDirecto = egresos.filter(m => ['Costo de Ventas', 'Costo de Ventas - Subcontratación', 'Costo de Ventas - Nómina', 'Compras'].includes(m.categoria_egreso || ''));
    
    // Gastos Operativos (Se incluye Operaciones por confirmación del usuario)
    const gastosOperativos = egresos.filter(m => ['Nomina', 'Servicios', 'Software', 'Marketing', 'Operaciones', 'Gastos Operativos'].includes(m.categoria_egreso || ''));
    
    const impuestos = egresos.filter(m => m.categoria_egreso === 'Impuestos');
    const otrosEgresos = egresos.filter(m => !['Costo de Ventas', 'Compras', 'Nomina', 'Servicios', 'Software', 'Marketing', 'Operaciones', 'Gastos Operativos', 'Impuestos'].includes(m.categoria_egreso || ''));

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

    // Margen Neto (Utilidad Neta / Ingresos Totales) para evitar distorsiones con Otros Ingresos
    const totalIngresos = totalIngresosOperativos + totalOtrosIngresos;
    const margenNeto = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;
    
    // Margen Operativo (EBITDA / Ingresos Operativos)
    const margenOperativo = totalIngresosOperativos > 0 ? (ebitda / totalIngresosOperativos) * 100 : 0;

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
      margenNeto,
      margenOperativo
    };
  }, [movimientos, anio, mes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end print:hidden">
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Descargar PDF (P&L)
        </button>
      </div>

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
          <h3 className={`text-2xl font-bold mt-1 ${data.margenNeto >= 0 ? 'text-white' : 'text-red-400'}`}>
            {data.margenNeto.toFixed(2)}%
          </h3>
          <p className="text-xs text-slate-400 mt-1">Margen Op: {data.margenOperativo.toFixed(2)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-none">
        <div className="p-5 border-b border-slate-50 bg-slate-50/50 print:bg-white print:border-b-2 print:border-slate-800">
          <h3 className="font-bold text-slate-800 text-xl">Estado de Resultados Consolidado</h3>
          <p className="text-sm text-slate-500 mt-1 hidden print:block">Período: {mes ? `${mes}/` : ''}{anio}</p>
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
