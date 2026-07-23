'use client';

import React, { useMemo, useState } from 'react';
import { MovimientoFinanciero, LineaProducto } from '@prisma/client';
import { Download, Eye } from 'lucide-react';

type MovimientoConLinea = MovimientoFinanciero & { linea_producto?: LineaProducto | null };

interface EstadoResultadosViewProps {
  movimientos: MovimientoConLinea[];
  anio: string;
  mes: string;
}

export function EstadoResultadosView({ movimientos, anio, mes }: EstadoResultadosViewProps) {

  const [vistaFiscal, setVistaFiscal] = useState(false);

  const data = useMemo(() => {
    let filtrados = movimientos.filter(m => {
      const d = new Date(m.fecha);
      const yearMatch = d.getFullYear().toString() === anio;
      const monthMatch = mes === '' || (d.getMonth() + 1).toString() === mes;
      const fiscalMatch = vistaFiscal ? m.es_fiscal === true : true;
      return yearMatch && monthMatch && fiscalMatch;
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
    const gastosOperativos = egresos.filter(m => ['Nomina', 'Servicios', 'Software', 'Marketing', 'Marketing y Pauta (CAC)', 'Operaciones', 'Gastos Operativos'].includes(m.categoria_egreso || ''));
    
    const impuestos = egresos.filter(m => m.categoria_egreso === 'Impuestos');
    const capex = egresos.filter(m => m.categoria_egreso === 'Inversión (CAPEX)');
    const otrosEgresos = egresos.filter(m => !['Costo de Ventas', 'Costo de Ventas - Subcontratación', 'Costo de Ventas - Nómina', 'Compras', 'Nomina', 'Servicios', 'Software', 'Marketing', 'Marketing y Pauta (CAC)', 'Operaciones', 'Gastos Operativos', 'Impuestos', 'Inversión (CAPEX)'].includes(m.categoria_egreso || ''));

    const totalIngresosOperativos = ingresosOperativos.reduce((acc, m) => acc + m.monto, 0);
    const totalOtrosIngresos = otrosIngresos.reduce((acc, m) => acc + m.monto, 0);
    const totalCostoDirecto = costoDirecto.reduce((acc, m) => acc + m.monto, 0);
    const totalGastosOperativos = gastosOperativos.reduce((acc, m) => acc + m.monto, 0);
    const totalImpuestos = impuestos.reduce((acc, m) => acc + m.monto, 0);
    const totalCapex = capex.reduce((acc, m) => acc + m.monto, 0);
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

    // Margen por Línea de Negocio
    const margenPorLinea = ingresosOperativos.reduce((acc, m) => {
      const linea = m.linea_producto?.nombre || 'Sin Línea Clasificada';
      if (!acc[linea]) acc[linea] = { ingresos: 0, cogs: 0 };
      acc[linea].ingresos += m.monto;
      return acc;
    }, {} as Record<string, { ingresos: number, cogs: number }>);

    costoDirecto.forEach(m => {
      const linea = m.linea_producto?.nombre || 'Sin Línea Clasificada';
      if (!margenPorLinea[linea]) margenPorLinea[linea] = { ingresos: 0, cogs: 0 };
      margenPorLinea[linea].cogs += m.monto;
    });

    const margenesLineaArray = Object.entries(margenPorLinea)
      .map(([nombre, {ingresos, cogs}]) => ({
        nombre,
        ingresos,
        cogs,
        margenBruto: ingresos - cogs,
        porcentaje: ingresos > 0 ? ((ingresos - cogs) / ingresos) * 100 : 0
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

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
      totalCapex,
      utilidadNeta,
      margenNeto,
      margenOperativo,
      margenesLineaArray
    };
  }, [movimientos, anio, mes, vistaFiscal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        
        {/* Toggle Vista Fiscal vs Global */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setVistaFiscal(false)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${!vistaFiscal ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Vista Global (Dueño)
          </button>
          <button
            onClick={() => setVistaFiscal(true)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${vistaFiscal ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Vista Fiscal (SAT)
          </button>
        </div>

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
            { label: 'Utilidad Neta', value: data.utilidadNeta, variant: 'final' },
            { label: 'Flujo de Inversión (CAPEX)', value: data.totalCapex, variant: 'negative' },
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

      {/* Margen por Línea de Negocio */}
      {data.margenesLineaArray.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-none">
          <div className="p-5 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg">Márgenes por Unidad de Negocio</h3>
          </div>
          <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.margenesLineaArray.map((linea, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2">
                <p className="font-bold text-slate-700">{linea.nombre}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ingresos:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(linea.ingresos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Costo (COGS):</span>
                  <span className="font-medium text-danger">{formatCurrency(linea.cogs)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Margen:</span>
                  <span className={`font-bold ${linea.margenBruto >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(linea.margenBruto)} ({linea.porcentaje.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
