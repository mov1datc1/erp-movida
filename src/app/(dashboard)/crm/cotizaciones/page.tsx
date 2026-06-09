import React from "react";
import { Search, FileText, Send, CheckCircle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import NuevaCotizacionBoton from "./NuevaCotizacionBoton";

export const dynamic = 'force-dynamic';

export default async function CotizacionesPage() {
  let cotizaciones: any[] = [];
  let clientes: any[] = [];
  let errorMsg = null;
  try {
    cotizaciones = await prisma.cotizacion.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    });
    clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (e: any) {
    console.error("Failed to fetch cotizaciones or clients", e);
    errorMsg = e.message;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    'BORRADOR': { label: 'Borrador', color: 'bg-slate-100 text-slate-600', icon: FileText },
    'ENVIADA': { label: 'Enviada', color: 'bg-blue-100 text-blue-600', icon: Send },
    'ACEPTADA': { label: 'Aceptada', color: 'bg-success/20 text-success', icon: CheckCircle },
    'RECHAZADA': { label: 'Rechazada', color: 'bg-danger/20 text-danger', icon: XCircle }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Cotizaciones</h1>
          <p className="text-text-muted mt-1">Administra los presupuestos para tus clientes.</p>
        </div>
        <NuevaCotizacionBoton clientes={clientes} />
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
          <p className="font-bold">Error de Base de Datos:</p>
          <pre className="text-xs whitespace-pre-wrap mt-2">{errorMsg}</pre>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por folio o cliente..." 
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
                <th className="px-6 py-4 font-semibold">Fecha Creación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {cotizaciones.length > 0 ? (
                cotizaciones.map((cotizacion) => {
                  const StatusIcon = statusMap[cotizacion.estatus]?.icon || FileText;
                  return (
                    <tr key={cotizacion.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-mono font-medium text-primary">
                        {cotizacion.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main group-hover:text-primary transition-colors">{cotizacion.cliente.nombre}</p>
                        <p className="text-xs text-text-muted">{cotizacion.cliente.empresa}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-main">
                        {formatCurrency(cotizacion.monto)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${statusMap[cotizacion.estatus]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMap[cotizacion.estatus]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(cotizacion.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-text-main">No hay cotizaciones</p>
                    <p className="text-sm mt-1">Crea una cotización para enviarla a tus prospectos.</p>
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
