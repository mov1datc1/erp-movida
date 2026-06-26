'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { FileText, Send, CheckCircle, XCircle } from "lucide-react";

const statusMap: Record<string, { label: string, color: string, icon: any }> = {
  'BORRADOR': { label: 'Borrador', color: 'bg-slate-100 text-slate-600', icon: FileText },
  'ENVIADA': { label: 'Enviada', color: 'bg-blue-100 text-blue-600', icon: Send },
  'ACEPTADA': { label: 'Aceptada', color: 'bg-success/20 text-success', icon: CheckCircle },
  'RECHAZADA': { label: 'Rechazada', color: 'bg-danger/20 text-danger', icon: XCircle }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function CotizacionesList({ cotizaciones }: { cotizaciones: any[] }) {
  const router = useRouter();

  if (cotizaciones.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-medium text-text-main">No hay cotizaciones</p>
          <p className="text-sm mt-1">Crea una cotización para enviarla a tus prospectos.</p>
        </td>
      </tr>
    );
  }

  return (
    <>
      {cotizaciones.map((cotizacion) => {
        const StatusIcon = statusMap[cotizacion.estatus]?.icon || FileText;
        return (
          <tr 
            key={cotizacion.id} 
            onClick={() => router.push(`/crm/cotizaciones/${cotizacion.id}`)}
            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
          >
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
            <td className="px-6 py-4 text-text-muted flex items-center justify-between">
              {new Date(cotizacion.createdAt).toLocaleDateString()}
              <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Ver detalles <span aria-hidden="true">&rarr;</span>
              </span>
            </td>
          </tr>
        )
      })}
    </>
  );
}
