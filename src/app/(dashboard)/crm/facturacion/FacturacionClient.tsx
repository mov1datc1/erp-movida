'use client';

import React, { useState } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, Download, Calendar } from "lucide-react";
import { createPrefactura, updatePrefactura } from './actions';

export function FacturacionClient({ facturas, clientes }: { facturas: any[], clientes: any[] }) {
  const [activeTab, setActiveTab] = useState<'por_cobrar' | 'historial'>('por_cobrar');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    cliente_id: '', 
    monto_total: '',
    fecha_vencimiento: '' 
  });
  
  // For printing
  const [printData, setPrintData] = useState<any>(null);

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

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ cliente_id: '', monto_total: '', fecha_vencimiento: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (factura: any) => {
    setEditingId(factura.id);
    setFormData({
      cliente_id: factura.cliente_id,
      monto_total: factura.monto_total.toString(),
      fecha_vencimiento: factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toISOString().split('T')[0] : ''
    });
    setPrintData(factura);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Cuentas por Cobrar & Facturación</h1>
          <p className="text-text-muted mt-1">Control de prefacturas y pagos de clientes.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20 print:hidden"
        >
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

      <div className="bg-surface rounded-3xl border border-slate-100 card-shadow overflow-hidden print:hidden">
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
                <th className="px-6 py-4 font-semibold">Empresa</th>
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
                    <tr 
                      key={factura.id} 
                      onClick={() => openEditModal(factura)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-primary">
                        {factura.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main">{factura.cliente.nombre}</p>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {factura.cliente.empresa || '-'}
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {editingId ? 'Detalles de Factura' : 'Crear Prefactura Manual'}
              </h2>
              {editingId && (
                <button 
                  onClick={handlePrint}
                  className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                  title="Descargar PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              
              let res;
              if (editingId) {
                res = await updatePrefactura(editingId, {
                  cliente_id: formData.cliente_id,
                  monto_total: parseFloat(formData.monto_total),
                  fecha_vencimiento: formData.fecha_vencimiento
                });
              } else {
                res = await createPrefactura({
                  cliente_id: formData.cliente_id,
                  monto_total: parseFloat(formData.monto_total),
                  fecha_vencimiento: formData.fecha_vencimiento
                });
              }
              
              setIsLoading(false);
              if (res.success) {
                setIsModalOpen(false);
                setFormData({ cliente_id: '', monto_total: '', fecha_vencimiento: '' });
                setEditingId(null);
              } else {
                alert(res.error);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                <select 
                  required
                  value={formData.cliente_id}
                  onChange={e => setFormData({...formData, cliente_id: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                >
                  <option value="">-- Seleccionar --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `(${c.empresa})` : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto Total *</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0"
                      value={formData.monto_total}
                      onChange={e => setFormData({...formData, monto_total: e.target.value})}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="date" 
                      value={formData.fecha_vencimiento}
                      onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || !formData.cliente_id || !formData.monto_total}
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Generar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bloque imprimible (oculto en pantalla) */}
      <div className="hidden print:block p-8">
        {printData && (
          <div className="space-y-6">
            <div className="border-b-2 border-slate-200 pb-6 mb-6">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">FACTURA {printData.folio}</h1>
              <div className="flex justify-between items-start mt-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Facturado a:</h3>
                  <p className="text-xl font-bold text-slate-800">{printData.cliente.nombre}</p>
                  {printData.cliente.empresa && <p className="text-slate-600">{printData.cliente.empresa}</p>}
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha de Emisión:</span>
                    <p className="font-medium text-slate-800">{new Date(printData.fecha_emision).toLocaleDateString()}</p>
                  </div>
                  {printData.fecha_vencimiento && (
                    <div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fecha de Vencimiento:</span>
                      <p className="font-medium text-slate-800">{new Date(printData.fecha_vencimiento).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left">
                  <th className="py-3 text-slate-600 font-semibold">Descripción</th>
                  <th className="py-3 text-right text-slate-600 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-800 font-medium">Servicios según presupuesto / cotización</td>
                  <td className="py-4 text-right text-slate-800 font-bold">{formatCurrency(printData.monto_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>TOTAL:</span>
                  <span className="text-primary">{formatCurrency(printData.monto_total)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
              <p>Estatus de Documento: <strong className="uppercase">{printData.estatus}</strong></p>
              <p className="mt-2">Gracias por su preferencia.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
