'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, Download, Calendar, Filter, FileSpreadsheet, Printer, CheckSquare, Star, Trash2, ChevronDown, Check } from "lucide-react";
import { createPrefactura, updatePrefactura, markFacturaAsPagada, saveFavoritoCXC, deleteFavoritoCXC } from './actions';
import { registrarPagoParcialCxC } from '@/app/actions/pagos';

export function FacturacionClient({ facturas, clientes, catalog = [], favoritos = [] }: { facturas: any[], clientes: any[], catalog?: any[], favoritos?: any[] }) {
  const [activeTab, setActiveTab] = useState<'por_cobrar' | 'historial'>('por_cobrar');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'none' | 'invoice' | 'table'>('none');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [favSearchTerm, setFavSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({ 
    cliente_id: '', 
    monto_total: '',
    fecha_vencimiento: '',
    descripcion: '',
    linea_producto_id: '',
    categoria: ''
  });
  
  // For printing
  const [printData, setPrintData] = useState<any>(null);

  // For partial payments
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [pagoFormData, setPagoFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'Transferencia',
    referencia: ''
  });

  // Dropdown States
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [searchClient, setSearchClient] = useState('');
  
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [searchCat, setSearchCat] = useState('');

  // Notification / Popup States
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success'|'error'}>({show: false, message: '', type: 'success'});
  const [favPromptOpen, setFavPromptOpen] = useState(false);
  const [favTitleInput, setFavTitleInput] = useState('');

  const showNotification = (message: string, type: 'success'|'error' = 'success') => {
    setNotification({show: true, message, type});
    setTimeout(() => setNotification({show: false, message: '', type: 'success'}), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    'PENDIENTE': { label: 'Por Cobrar', color: 'bg-orange-100 text-orange-600', icon: Clock },
    'PAGADA_PARCIALMENTE': { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-600', icon: Clock },
    'PAGADA': { label: 'Pagada', color: 'bg-success/20 text-success', icon: CheckCircle },
    'VENCIDA': { label: 'Vencida', color: 'bg-danger/20 text-danger', icon: AlertTriangle },
    'CANCELADA': { label: 'Cancelada', color: 'bg-slate-200 text-slate-600', icon: FileText }
  };

  const totalPorCobrar = facturas.filter(f => f.estatus === 'PENDIENTE' || f.estatus === 'PAGADA_PARCIALMENTE').reduce((a, b) => a + (b.monto_total - (b.monto_pagado || 0)), 0);
  const totalVencido = facturas.filter(f => f.estatus === 'VENCIDA').reduce((a, b) => a + (b.monto_total - (b.monto_pagado || 0)), 0);

  const filteredFacturas = useMemo(() => {
    return facturas.filter(f => {
      // Search
      const matchesSearch = f.folio.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            f.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (f.cliente.empresa && f.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Tab Filter
      if (activeTab === 'por_cobrar') {
        if (f.estatus !== 'PENDIENTE' && f.estatus !== 'VENCIDA' && f.estatus !== 'PAGADA_PARCIALMENTE') return false;
      } else {
        if (f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA' || f.estatus === 'PAGADA_PARCIALMENTE') return false;
      }

      // Date Filter
      if (dateFilter !== 'all') {
        const date = new Date(f.fecha_emision);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        switch(dateFilter) {
          case '7d': if (diffDays > 7) return false; break;
          case '15d': if (diffDays > 15) return false; break;
          case 'this_month': 
            if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
            break;
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (date.getMonth() !== lastMonth.getMonth() || date.getFullYear() !== lastMonth.getFullYear()) return false;
            break;
          case '3m': if (diffDays > 90) return false; break;
          case '6m': if (diffDays > 180) return false; break;
        }
      }

      return true;
    });
  }, [facturas, searchTerm, activeTab, dateFilter]);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ cliente_id: '', monto_total: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '' });
    setShowFavoritos(false);
    setFavSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (factura: any) => {
    setEditingId(factura.id);
    setFormData({
      cliente_id: factura.cliente_id,
      monto_total: factura.monto_total.toString(),
      fecha_vencimiento: factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toISOString().split('T')[0] : '',
      descripcion: factura.descripcion || '',
      linea_producto_id: factura.linea_producto_id || '',
      categoria: factura.categoria || ''
    });
    setPrintData(factura);
    setShowFavoritos(false);
    setFavSearchTerm('');
    setIsModalOpen(true);
  };

  const handlePrintInvoice = () => {
    setPrintMode('invoice');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 100);
  };

  const handlePrintTable = () => {
    setPrintMode('table');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 100);
  };

  const handleExportCSV = () => {
    let csv = 'Folio,Cliente,Empresa,Monto,Estatus,Emisión,Vencimiento\n';
    filteredFacturas.forEach(f => {
      csv += `${f.folio},"${f.cliente.nombre}","${f.cliente.empresa || ''}",${f.monto_total},${f.estatus},${new Date(f.fecha_emision).toLocaleDateString()},${f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString() : ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cuentas_por_Cobrar_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveFavorito = async () => {
    if (!formData.monto_total || !formData.cliente_id || !formData.descripcion) {
      showNotification("Para guardar un favorito necesitas ingresar el Cliente, Monto y Descripción.", 'error');
      return;
    }
    setFavTitleInput('');
    setFavPromptOpen(true);
  };

  const confirmSaveFavorito = async () => {
    if (!favTitleInput.trim()) return;
    setFavPromptOpen(false);
    
    setIsLoading(true);
    const res = await saveFavoritoCXC({
      titulo: favTitleInput,
      monto: parseFloat(formData.monto_total),
      descripcion: formData.descripcion,
      cliente_id: formData.cliente_id
    });
    setIsLoading(false);
    if (res.success) {
      showNotification("¡Favorito guardado correctamente!", 'success');
    } else {
      showNotification(res.error || 'Error al guardar favorito', 'error');
    }
  };

  return (
    <div className={`space-y-6 ${printMode === 'invoice' ? 'print:invoice-mode' : printMode === 'table' ? 'print:table-mode' : ''}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print\\:invoice-mode .print-table-wrapper { display: none !important; }
          .print\\:invoice-mode .print-cards { display: none !important; }
          
          .print\\:table-mode .print-invoice-wrapper { display: none !important; }
          .print\\:table-mode .print-cards { display: none !important; }
          .print\\:table-mode .print-header { display: none !important; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print-header">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-cards">
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

      <div className="bg-surface rounded-3xl border border-slate-100 card-shadow overflow-hidden print-table-wrapper">
        {/* Tabs and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex px-6 pt-2 gap-2">
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
          
          <div className="flex items-center gap-3 px-6 py-3 lg:py-0">
            <button onClick={handleExportCSV} className="text-slate-600 hover:text-success bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={handlePrintTable} className="text-slate-600 hover:text-danger bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por folio o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium transition-colors shadow-sm ${dateFilter !== 'all' ? 'border-primary text-primary bg-primary/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              Filtro de Fecha
            </button>
            
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="py-1">
                    {[
                      { id: 'all', label: 'Todo el tiempo' },
                      { id: '7d', label: 'Últimos 7 días' },
                      { id: '15d', label: 'Últimos 15 días' },
                      { id: 'this_month', label: 'Este mes' },
                      { id: 'last_month', label: 'Mes pasado' },
                      { id: '3m', label: 'Últimos 3 meses' },
                      { id: '6m', label: 'Últimos 6 meses' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setDateFilter(opt.id); setIsFilterMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${dateFilter === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Folio</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Categoría</th>
                <th className="px-6 py-4 font-semibold">Monto</th>
                <th className="px-6 py-4 font-semibold">Estatus</th>
                <th className="px-6 py-4 font-semibold">Emisión</th>
                <th className="px-6 py-4 font-semibold">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredFacturas.length > 0 ? (
                filteredFacturas.map((f) => {
                  const isVencida = (f.estatus === 'PENDIENTE' || f.estatus === 'PAGADA_PARCIALMENTE') && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date(new Date().setHours(0,0,0,0));
                  const currentStatus = isVencida ? 'VENCIDA' : f.estatus;
                  const StatusIcon = statusMap[currentStatus]?.icon || FileText;
                  
                  return (
                    <tr 
                      key={f.id} 
                      onClick={() => openEditModal(f)}
                      className={`transition-colors group cursor-pointer ${isVencida ? 'bg-red-50/40 hover:bg-red-50/80 border-b border-red-100' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className={`px-6 py-4 font-mono font-medium ${isVencida ? 'text-red-600' : 'text-primary'}`}>
                        {f.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-bold ${isVencida ? 'text-red-900' : 'text-text-main'}`}>{f.cliente.nombre}</p>
                        {f.cliente.empresa && <p className={`text-xs mt-0.5 ${isVencida ? 'text-red-700' : 'text-text-muted'}`}>{f.cliente.empresa}</p>}
                        {f.descripcion && <p className={`text-xs mt-0.5 truncate max-w-[200px] ${isVencida ? 'text-red-700' : 'text-text-muted'}`}>{f.descripcion}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {f.categoria || '-'}
                      </td>
                      <td className={`px-6 py-4 font-bold ${isVencida ? 'text-red-700' : 'text-text-main'}`}>
                        {formatCurrency(f.monto_total)}
                        {(f.monto_pagado || 0) > 0 && <p className="text-xs font-medium text-emerald-600 mt-0.5">Pagado: {formatCurrency(f.monto_pagado)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${statusMap[currentStatus]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMap[currentStatus]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(f.fecha_emision).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 font-medium ${isVencida ? 'text-red-600' : 'text-text-muted'}`}>
                        {f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-text-main">No hay registros</p>
                    <p className="text-sm">No se encontraron facturas en esta vista.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-0 animate-in zoom-in-95 duration-200 overflow-visible flex relative">
            
            {/* Inline Notification Overlay */}
            {notification.show && (
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-in slide-in-from-top-2 ${
                notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {notification.message}
              </div>
            )}

            {/* Inline Prompt for Favorito */}
            {favPromptOpen && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-40 text-center rounded-2xl animate-in fade-in">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <Star className="w-10 h-10 text-amber-500 fill-amber-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Guardar como Favorito</h3>
                  <p className="text-sm text-slate-500 mb-4">Dale un título a este cobro frecuente (Ej: Iguala de Marketing X):</p>
                  <input 
                    type="text"
                    value={favTitleInput}
                    onChange={(e) => setFavTitleInput(e.target.value)}
                    placeholder="Título del favorito..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none mb-4"
                    autoFocus
                  />
                  <div className="flex gap-2 w-full">
                    <button onClick={() => setFavPromptOpen(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors text-sm">Cancelar</button>
                    <button onClick={confirmSaveFavorito} className="flex-1 py-2 bg-primary hover:bg-primary-light text-white rounded-lg font-semibold transition-colors text-sm">Guardar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Favoritos Sidebar (Only on new) */}
            {(!editingId || showFavoritos) && (
              <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col h-[600px] overflow-hidden hidden md:flex">
                <div className="p-4 border-b border-slate-200 bg-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-slate-800 text-sm">Frecuentes / Favoritos</span>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Buscar favorito..." 
                      value={favSearchTerm}
                      onChange={(e) => setFavSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-2">
                  {favoritos.filter(f => f.titulo.toLowerCase().includes(favSearchTerm.toLowerCase()) || f.cliente?.nombre?.toLowerCase().includes(favSearchTerm.toLowerCase())).length === 0 ? (
                    <div className="text-center p-4 text-sm text-slate-400">No se encontraron favoritos.</div>
                  ) : (
                    favoritos.filter(f => f.titulo.toLowerCase().includes(favSearchTerm.toLowerCase()) || f.cliente?.nombre?.toLowerCase().includes(favSearchTerm.toLowerCase())).map(fav => (
                      <div key={fav.id} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-primary/50 cursor-pointer group shadow-sm transition-all"
                        onClick={() => {
                          setFormData({
                            cliente_id: fav.cliente_id || '',
                            monto_total: fav.monto.toString(),
                            descripcion: fav.descripcion || '',
                            linea_producto_id: '',
                            categoria: '',
                            fecha_vencimiento: formData.fecha_vencimiento
                          });
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{fav.titulo}</h4>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if(window.confirm("¿Eliminar favorito?")) {
                                await deleteFavoritoCXC(fav.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-danger transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{fav.cliente?.nombre}</p>
                        <p className="font-bold text-primary mt-1">{formatCurrency(fav.monto)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 p-6 flex flex-col h-[600px] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {editingId ? 'Detalles de Factura' : 'Crear Prefactura Manual'}
              </h2>
              <div className="flex items-center gap-2">
                {editingId && (printData?.estatus === 'PENDIENTE' || printData?.estatus === 'VENCIDA' || printData?.estatus === 'PAGADA_PARCIALMENTE') && (
                  <button 
                    type="button"
                    onClick={() => {
                      setPagoFormData({
                        monto: (printData.monto_total - (printData.monto_pagado || 0)).toString(),
                        fecha: new Date().toISOString().split('T')[0],
                        metodo_pago: 'Transferencia',
                        referencia: ''
                      });
                      setIsPagoModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4" /> Registrar Pago
                  </button>
                )}
                {editingId && (
                  <button 
                    type="button"
                    onClick={handlePrintInvoice}
                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                    title="Descargar PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
                {!editingId && (
                  <button 
                    type="button"
                    onClick={handleSaveFavorito}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                    title="Guardar como Favorito (Requiere llenar cliente, monto y descripción)"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              
              let res;
              if (editingId) {
                res = await updatePrefactura(editingId, {
                  cliente_id: formData.cliente_id,
                  monto_total: parseFloat(formData.monto_total),
                  fecha_vencimiento: formData.fecha_vencimiento,
                  descripcion: formData.descripcion,
                  categoria: formData.categoria
                });
              } else {
                res = await createPrefactura({
                  cliente_id: formData.cliente_id,
                  monto_total: parseFloat(formData.monto_total),
                  fecha_vencimiento: formData.fecha_vencimiento,
                  descripcion: formData.descripcion,
                  categoria: formData.categoria
                });
              }
              
              setIsLoading(false);
              if (res.success) {
                setIsModalOpen(false);
                setFormData({ cliente_id: '', monto_total: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '' });
                setEditingId(null);
              } else {
                showNotification(res.error || 'Error al guardar', 'error');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                
                {/* Custom Searchable Dropdown for Cliente */}
                <div className="relative">
                  <div 
                    className={`w-full px-4 py-2.5 border rounded-xl flex justify-between items-center bg-white cursor-pointer transition-all ${showClientDropdown ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}
                    onClick={() => {
                      setShowClientDropdown(!showClientDropdown);
                      if (showCatDropdown) setShowCatDropdown(false);
                    }}
                  >
                    <span className={formData.cliente_id ? "text-slate-800 font-medium" : "text-slate-400"}>
                      {formData.cliente_id 
                        ? clientes.find(c => c.id === formData.cliente_id)?.nombre || 'Seleccionar Cliente'
                        : '-- Seleccionar Cliente --'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {showClientDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowClientDropdown(false)}></div>
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar cliente..."
                              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-primary"
                              value={searchClient}
                              onChange={e => setSearchClient(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1.5">
                          {clientes.filter(c => c.nombre.toLowerCase().includes(searchClient.toLowerCase()) || (c.empresa && c.empresa.toLowerCase().includes(searchClient.toLowerCase()))).map(c => (
                            <div 
                              key={c.id} 
                              className="px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary cursor-pointer rounded-lg font-medium text-slate-700"
                              onClick={() => { 
                                setFormData({...formData, cliente_id: c.id}); 
                                setShowClientDropdown(false); 
                                setSearchClient(''); 
                              }}
                            >
                              {c.nombre} {c.empresa && <span className="text-slate-400 font-normal ml-1">({c.empresa})</span>}
                            </div>
                          ))}
                          {clientes.filter(c => c.nombre.toLowerCase().includes(searchClient.toLowerCase()) || (c.empresa && c.empresa.toLowerCase().includes(searchClient.toLowerCase()))).length === 0 && (
                            <div className="px-3 py-3 text-sm text-center text-slate-500">No se encontró cliente</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Producto / Concepto Asociado (Catálogo)</label>
                </div>
                <select 
                  value={formData.linea_producto_id ? `${formData.linea_producto_id}|${formData.descripcion}` : formData.descripcion}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('|')) {
                      const [lineaId, nombre] = val.split('|');
                      setFormData({...formData, linea_producto_id: lineaId, descripcion: nombre});
                    } else {
                      setFormData({...formData, linea_producto_id: '', descripcion: val});
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                >
                  <option value="">-- Personalizado / Según Cotización --</option>
                  {catalog.map((linea: any) => (
                    <optgroup key={linea.id} label={linea.nombre}>
                      {linea.productos.map((prod: any) => (
                        <option key={prod.id} value={`${linea.id}|${prod.nombre}`}>{prod.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Este será el concepto mostrado en el PDF descargable.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría de Ingreso *</label>
                
                {/* Custom Searchable Dropdown for Categoria */}
                <div className="relative">
                  <div 
                    className={`w-full px-4 py-2.5 border rounded-xl flex justify-between items-center bg-white cursor-pointer transition-all ${showCatDropdown ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary/50'}`}
                    onClick={() => {
                      setShowCatDropdown(!showCatDropdown);
                      if (showClientDropdown) setShowClientDropdown(false);
                    }}
                  >
                    <span className={formData.categoria ? "text-slate-800 font-medium" : "text-slate-400"}>
                      {formData.categoria || '-- Seleccionar Categoría --'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {showCatDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)}></div>
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar categoría..."
                              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-primary"
                              value={searchCat}
                              onChange={e => setSearchCat(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1.5">
                          {['Ventas y Servicios', 'Subarrendamiento', 'Venta de Activos', 'Comisiones', 'Reembolsos', 'Otros'].filter(c => c.toLowerCase().includes(searchCat.toLowerCase())).map(cat => (
                            <div 
                              key={cat} 
                              className="px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary cursor-pointer rounded-lg font-medium text-slate-700"
                              onClick={() => { 
                                setFormData({...formData, categoria: cat === 'Otros' ? 'Otros Ingresos' : cat}); 
                                setShowCatDropdown(false); 
                                setSearchCat(''); 
                              }}
                            >
                              {cat === 'Otros' ? 'Otros Ingresos' : cat}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
                  disabled={isLoading || !formData.cliente_id || !formData.monto_total || (printData && printData.estatus !== 'PENDIENTE' && printData.estatus !== 'VENCIDA' && printData.estatus !== 'BORRADOR')}
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Generar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Modal Registrar Pago */}
      {isPagoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registrar Pago
              </h2>
              <p className="text-sm text-slate-500 mt-1">Monto pendiente: <strong className="text-slate-800">{formatCurrency(printData.monto_total - (printData.monto_pagado || 0))}</strong></p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              
              const res = await registrarPagoParcialCxC(editingId!, {
                monto: parseFloat(pagoFormData.monto),
                fecha: new Date(`${pagoFormData.fecha}T12:00:00`),
                metodo_pago: pagoFormData.metodo_pago,
                referencia: pagoFormData.referencia
              });
              
              setIsLoading(false);
              if (res.success) {
                setIsPagoModalOpen(false);
                setIsModalOpen(false);
                setEditingId(null);
                showNotification('Pago registrado con éxito. Ingreso creado en módulo contable.', 'success');
              } else {
                showNotification(res.error || 'Error al registrar pago', 'error');
              }
            }} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Pagar *</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0.01"
                      max={printData.monto_total - (printData.monto_pagado || 0)}
                      value={pagoFormData.monto}
                      onChange={e => setPagoFormData({...pagoFormData, monto: e.target.value})}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                  <input 
                    type="date" 
                    required
                    value={pagoFormData.fecha}
                    onChange={e => setPagoFormData({...pagoFormData, fecha: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago *</label>
                <select 
                  required
                  value={pagoFormData.metodo_pago}
                  onChange={e => setPagoFormData({...pagoFormData, metodo_pago: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium bg-white"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Referencia (Opcional)</label>
                <input 
                  type="text" 
                  value={pagoFormData.referencia}
                  onChange={e => setPagoFormData({...pagoFormData, referencia: e.target.value})}
                  placeholder="# de transacción o comprobante"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsPagoModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || !pagoFormData.monto}
                  className="flex-1 px-4 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bloque imprimible de factura (oculto en pantalla) */}
      <div className="hidden print:block p-8 print-invoice-wrapper">
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
                  <td className="py-4 text-slate-800 font-medium">{printData.descripcion || 'Servicios según presupuesto / cotización'}</td>
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
