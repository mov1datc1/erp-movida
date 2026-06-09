import React from "react";
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function FacturacionPage() {
  let facturas = [];
  try {
    facturas = await prisma.factura.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    console.error("Failed to fetch facturas", e);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    'PENDIENTE': { label: 'Por Cobrar', color: 'bg-orange-100 text-orange-600', icon: Clock },
    'PAGADA': { label: 'Pagada', color: 'bg-success/20 text-success', icon: CheckCircle },
    'VENCIDA': { label: 'Vencida', color: 'bg-danger/20 text-danger', icon: AlertTriangle },
    'CANCELADA': { label: 'Cancelada', color: 'bg-slate-200 text-slate-600', icon: FileText }
  };

  // KPIs
  const totalPorCobrar = facturas.filter(f => f.estatus === 'PENDIENTE').reduce((a, b) => a + b.monto_total, 0);
  const totalVencido = facturas.filter(f => f.estatus === 'VENCIDA').reduce((a, b) => a + b.monto_total, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Facturación</h1>
          <p className="text-text-muted mt-1">Control de emisión y cuentas por cobrar.</p>
        </div>
        <button className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" />
          Emitir Factura
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl p-6 border border-slate-100 card-shadow">
          <p className="text-sm font-medium text-text-muted">Total Cuentas por Cobrar</p>
          <h3 className="text-3xl font-bold text-text-main mt-2">{formatCurrency(totalPorCobrar)}</h3>
          <p className="text-xs font-medium text-orange-500 mt-2 flex items-center gap-1"><Clock className="w-4 h-4"/> Pendientes de pago</p>
        </div>
        <div className="bg-surface rounded-2xl p-6 border border-slate-100 card-shadow">
          <p className="text-sm font-medium text-text-muted">Total Vencido</p>
          <h3 className="text-3xl font-bold text-danger mt-2">{formatCurrency(totalVencido)}</h3>
          <p className="text-xs font-medium text-danger mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Requiere acción inmediata</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por folio..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Folio</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Monto</th>
                <th className="px-6 py-4 font-semibold">Estatus</th>
                <th className="px-6 py-4 font-semibold">Emisión</th>
                <th className="px-6 py-4 font-semibold">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {facturas.length > 0 ? (
                facturas.map((factura) => {
                  const StatusIcon = statusMap[factura.estatus]?.icon || FileText;
                  return (
                    <tr key={factura.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-mono font-medium text-primary">
                        {factura.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main">{factura.cliente.nombre}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-main">
                        {formatCurrency(factura.monto_total)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${statusMap[factura.estatus]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMap[factura.estatus]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(factura.fecha_emision).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-text-main">No hay facturas emitidas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
