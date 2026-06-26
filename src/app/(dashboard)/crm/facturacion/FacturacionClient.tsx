'use client';

import React, { useState } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export function FacturacionClient({ facturas }: { facturas: any[] }) {
  const [activeTab, setActiveTab] = useState<'por_cobrar' | 'historial'>('por_cobrar');
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    'PENDIENTE': { label: 'Por Cobrar', color: 'bg-orange-100 text-orange-600', icon: Clock },
    'PAGADA': { label: 'Pagada', color: 'bg-success/20 text-success', icon: CheckCircle },
    'VENCIDA': { label: 'Vencida', color: 'bg-danger/20 text-danger', icon: AlertTriangle },
    'CANCELADA': { label: 'Cancelada', color: 'bg-slate-200 text-slate-600', icon: FileText }
  };

  const totalPorCobrar = facturas.filter(f => f.estatus === 'PENDIENTE').reduce((a, b) => a + b.monto_total, 0);
  const totalVencido = facturas.filter(f => f.estatus === 'VENCIDA').reduce((a, b) => a + b.monto_total, 0);

  const filteredFacturas = facturas.filter(f => {
    const matchesSearch = f.folio.toLowerCase().includes(searchTerm.toLowerCase()) || f.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'por_cobrar') {
      return f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA';
    } else {
      return true; // Show all in history, or just PAGADA/CANCELADA
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Cuentas por Cobrar & Facturación</h1>
          <p className="text-text-muted mt-1">Control de prefacturas y pagos de clientes.</p>
        </div>
        <button className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" />
          Nueva Prefactura
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-2 bg-white/20 w-fit rounded-xl backdrop-blur-sm mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <p className="text-orange-100 font-medium text-sm">Total Cuentas por Cobrar (Prefacturas)</p>
            <h3 className="text-4xl font-bold mt-1 tracking-tight">{formatCurrency(totalPorCobrar)}</h3>
            <p className="text-xs font-medium text-orange-100 mt-2">Dinero pendiente de recaudo</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>

        <div className="bg-surface rounded-3xl p-6 border border-slate-100 card-shadow">
          <div className="p-2 bg-red-50 text-red-500 w-fit rounded-xl mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium text-sm">Total Vencido</p>
          <h3 className="text-3xl font-bold text-danger mt-1 tracking-tight">{formatCurrency(totalVencido)}</h3>
          <p className="text-xs font-medium text-slate-400 mt-2">Requiere seguimiento inmediato con el cliente</p>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-slate-100 card-shadow overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-2 gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('por_cobrar')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'por_cobrar' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Cuentas por Cobrar (Prefacturas)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Historial General
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por folio o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              {filteredFacturas.length > 0 ? (
                filteredFacturas.map((factura) => {
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
                    <p className="text-lg font-medium text-text-main">No hay registros</p>
                    <p className="text-sm">No se encontraron prefacturas o facturas en esta vista.</p>
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
