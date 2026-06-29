'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, Download, Calendar, Filter, FileSpreadsheet, Printer, CheckSquare, Star, Trash2 } from "lucide-react";
import { createCuentaPorPagar, updateCuentaPorPagar, markCuentaAsPagada, saveFavoritoCXP, deleteFavoritoCXP, createProveedor } from './actions';

export function CuentasPorPagarClient({ cuentas, proveedores, favoritos }: { cuentas: any[], proveedores: any[], favoritos: any[] }) {
  const [activeTab, setActiveTab] = useState<'por_pagar' | 'historial'>('por_pagar');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'none' | 'invoice' | 'table'>('none');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFavoritos, setShowFavoritos] = useState(false);
  
  const [formData, setFormData] = useState({ 
    proveedor_id: '', 
    monto_total: '',
    fecha_vencimiento: '',
    descripcion: '',
    categoria: ''
  });
  
  // For printing
  const [printData, setPrintData] = useState<any>(null);

  // New Proveedor modal
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [newProveedorName, setNewProveedorName] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    'PENDIENTE': { label: 'Por Pagar', color: 'bg-orange-100 text-orange-600', icon: Clock },
    'PAGADA': { label: 'Pagada', color: 'bg-success/20 text-success', icon: CheckCircle },
    'VENCIDA': { label: 'Vencida', color: 'bg-danger/20 text-danger', icon: AlertTriangle },
    'CANCELADA': { label: 'Cancelada', color: 'bg-slate-200 text-slate-600', icon: FileText }
  };

  const totalPorPagar = cuentas.filter(c => c.estatus === 'PENDIENTE').reduce((a, b) => a + b.monto_total, 0);
  const totalVencido = cuentas.filter(c => c.estatus === 'VENCIDA').reduce((a, b) => a + b.monto_total, 0);

  const filteredCuentas = useMemo(() => {
    return cuentas.filter(c => {
      // Search
      const matchesSearch = c.folio.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (c.proveedor.empresa && c.proveedor.empresa.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Tab Filter
      if (activeTab === 'por_pagar') {
        if (c.estatus !== 'PENDIENTE' && c.estatus !== 'VENCIDA') return false;
      } else {
        if (c.estatus === 'PENDIENTE' || c.estatus === 'VENCIDA') return false;
      }

      // Date Filter
      if (dateFilter !== 'all') {
        const date = new Date(c.fecha_emision);
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
  }, [cuentas, searchTerm, activeTab, dateFilter]);

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ proveedor_id: '', monto_total: '', fecha_vencimiento: '', descripcion: '', categoria: '' });
    setShowFavoritos(false);
    setIsModalOpen(true);
  };

  const openEditModal = (cuenta: any) => {
    setEditingId(cuenta.id);
    setFormData({
      proveedor_id: cuenta.proveedor_id,
      monto_total: cuenta.monto_total.toString(),
      fecha_vencimiento: cuenta.fecha_vencimiento ? new Date(cuenta.fecha_vencimiento).toISOString().split('T')[0] : '',
      descripcion: cuenta.descripcion || '',
      categoria: cuenta.categoria || ''
    });
    setPrintData(cuenta);
    setShowFavoritos(false);
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
    let csv = 'Folio,Proveedor,Empresa,Monto,Estatus,Emisión,Vencimiento\n';
    filteredCuentas.forEach(c => {
      csv += `${c.folio},"${c.proveedor.nombre}","${c.proveedor.empresa || ''}",${c.monto_total},${c.estatus},${new Date(c.fecha_emision).toLocaleDateString()},${c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cuentas_por_Pagar_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveFavorito = async () => {
    if (!formData.monto_total || !formData.proveedor_id || !formData.descripcion) {
      alert("Para guardar un favorito necesitas ingresar el Proveedor, Monto y Descripción.");
      return;
    }
    const titulo = prompt("Dale un título a este pago frecuente (Ej: Renta de Oficina):");
    if (!titulo) return;
    
    setIsLoading(true);
    const res = await saveFavoritoCXP({
      titulo,
      monto: parseFloat(formData.monto_total),
      descripcion: formData.descripcion,
      proveedor_id: formData.proveedor_id
    });
    setIsLoading(false);
    if (res.success) {
      alert("¡Favorito guardado!");
    } else {
      alert(res.error);
    }
  };

  const handleCreateProveedor = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await createProveedor({ nombre: newProveedorName });
    setIsLoading(false);
    if (res.success) {
      setIsProveedorModalOpen(false);
      setNewProveedorName('');
      if (res.data) setFormData({...formData, proveedor_id: res.data.id});
    } else {
      alert(res.error);
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
          <h1 className="text-3xl font-bold text-primary tracking-tight">Cuentas por Pagar</h1>
          <p className="text-text-muted mt-1">Control de pagos a proveedores y obligaciones.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20 print:hidden"
        >
          <Plus className="w-5 h-5" />
          Nuevo Egreso por Pagar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-cards">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-2 bg-white/20 w-fit rounded-xl backdrop-blur-sm mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <p className="text-indigo-100 font-medium text-sm">Total Cuentas por Pagar</p>
            <h3 className="text-4xl font-bold mt-1 tracking-tight">{formatCurrency(totalPorPagar)}</h3>
            <p className="text-xs font-medium text-indigo-100 mt-2">Dinero pendiente de pagar a proveedores</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>

        <div className="bg-surface rounded-3xl p-6 border border-slate-100 card-shadow">
          <div className="p-2 bg-red-50 text-red-500 w-fit rounded-xl mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium text-sm">Total Vencido</p>
          <h3 className="text-3xl font-bold text-danger mt-1 tracking-tight">{formatCurrency(totalVencido)}</h3>
          <p className="text-xs font-medium text-slate-400 mt-2">Requiere pago inmediato</p>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-slate-100 card-shadow overflow-hidden print-table-wrapper">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex px-6 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('por_pagar')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'por_pagar' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Cuentas por Pagar
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
              placeholder="Buscar por folio o proveedor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>

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
                <th className="px-6 py-4 font-semibold">Proveedor</th>
                <th className="px-6 py-4 font-semibold">Categoría</th>
                <th className="px-6 py-4 font-semibold">Monto</th>
                <th className="px-6 py-4 font-semibold">Estatus</th>
                <th className="px-6 py-4 font-semibold">Emisión</th>
                <th className="px-6 py-4 font-semibold">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCuentas.length > 0 ? (
                filteredCuentas.map((cuenta) => {
                  const StatusIcon = statusMap[cuenta.estatus]?.icon || FileText;
                  return (
                    <tr 
                      key={cuenta.id} 
                      onClick={() => openEditModal(cuenta)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-primary">
                        {cuenta.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main">{cuenta.proveedor.nombre}</p>
                        {cuenta.descripcion && <p className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]">{cuenta.descripcion}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {cuenta.categoria || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-text-main">
                        {formatCurrency(cuenta.monto_total)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${statusMap[cuenta.estatus]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMap[cuenta.estatus]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(cuenta.fecha_emision).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {cuenta.fecha_vencimiento ? new Date(cuenta.fecha_vencimiento).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-text-main">No hay registros</p>
                    <p className="text-sm">No se encontraron cuentas por pagar en esta vista.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 animate-in zoom-in-95 duration-200 overflow-hidden flex">
            
            {/* Favoritos Sidebar (Only on new) */}
            {(!editingId || showFavoritos) && (
              <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col h-[600px] overflow-hidden hidden sm:flex">
                <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-slate-800 text-sm">Frecuentes / Favoritos</span>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-2">
                  {favoritos.length === 0 ? (
                    <div className="text-center p-4 text-sm text-slate-400">No tienes favoritos guardados.</div>
                  ) : (
                    favoritos.map(fav => (
                      <div key={fav.id} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-primary/50 cursor-pointer group shadow-sm transition-all"
                        onClick={() => {
                          setFormData({
                            proveedor_id: fav.proveedor_id || '',
                            monto_total: fav.monto.toString(),
                            descripcion: fav.descripcion || '',
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
                                await deleteFavoritoCXP(fav.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-danger transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{fav.proveedor?.nombre}</p>
                        <p className="font-bold text-primary mt-1">{formatCurrency(fav.monto)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 p-6 flex flex-col h-[600px] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {editingId ? 'Detalles de Cuenta por Pagar' : 'Registrar Pago Pendiente'}
                </h2>
                <div className="flex items-center gap-2">
                  {editingId && (printData?.estatus === 'PENDIENTE' || printData?.estatus === 'VENCIDA') && (
                    <button 
                      type="button"
                      onClick={async () => {
                        const registerInFinance = window.confirm('¿Registrar también este EGRESO en el módulo de Finanzas automáticamente?');
                        setIsLoading(true);
                        const res = await markCuentaAsPagada(editingId, registerInFinance);
                        setIsLoading(false);
                        if (res.success) {
                          setIsModalOpen(false);
                          setEditingId(null);
                        } else {
                          alert(res.error);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                    >
                      <CheckSquare className="w-4 h-4" /> Marcar Pagada
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
                      title="Guardar como Favorito (Requiere llenar proveedor, monto y descripción)"
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
                  res = await updateCuentaPorPagar(editingId, {
                    proveedor_id: formData.proveedor_id,
                    monto_total: parseFloat(formData.monto_total),
                    fecha_vencimiento: formData.fecha_vencimiento,
                    descripcion: formData.descripcion,
                    categoria: formData.categoria
                  });
                } else {
                  res = await createCuentaPorPagar({
                    proveedor_id: formData.proveedor_id,
                    monto_total: parseFloat(formData.monto_total),
                    fecha_vencimiento: formData.fecha_vencimiento,
                    descripcion: formData.descripcion,
                    categoria: formData.categoria
                  });
                }
                
                setIsLoading(false);
                if (res.success) {
                  setIsModalOpen(false);
                  setFormData({ proveedor_id: '', monto_total: '', fecha_vencimiento: '', descripcion: '', categoria: '' });
                  setEditingId(null);
                } else {
                  alert(res.error);
                }
              }} className="space-y-4 flex-1">
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Proveedor *</label>
                    <button type="button" onClick={() => setIsProveedorModalOpen(true)} className="text-xs text-primary hover:underline font-semibold">
                      + Crear Nuevo
                    </button>
                  </div>
                  <select 
                    required
                    value={formData.proveedor_id}
                    onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.empresa ? `(${p.empresa})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Concepto / Descripción *</label>
                  <input 
                    type="text"
                    required
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Ej: Renta de oficina del mes, Compra de insumos..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría de Gasto *</label>
                  <select 
                    required
                    value={formData.categoria}
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                  >
                    <option value="">-- Seleccionar Categoría --</option>
                    <option value="Nomina">Nómina</option>
                    <option value="Servicios">Servicios (Luz, Internet)</option>
                    <option value="Software">Licencias de Software</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Operaciones">Operaciones</option>
                    <option value="Marketing">Marketing y Ventas</option>
                    <option value="Otros">Otros Egresos</option>
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

                <div className="flex gap-3 pt-4 mt-auto">
                  <button 
                    type="button" 
                    onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                    className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading || !formData.proveedor_id || !formData.monto_total || !formData.descripcion || (printData && printData.estatus !== 'PENDIENTE' && printData.estatus !== 'VENCIDA')}
                    className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Registrar Cuenta')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Proveedor Modal */}
      {isProveedorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Proveedor</h2>
            <form onSubmit={handleCreateProveedor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial / Razón Social *</label>
                <input 
                  type="text"
                  required
                  value={newProveedorName}
                  onChange={e => setNewProveedorName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 bg-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsProveedorModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || !newProveedorName}
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
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
              <h1 className="text-4xl font-bold text-slate-900 mb-2">CUENTA POR PAGAR {printData.folio}</h1>
              <div className="flex justify-between items-start mt-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">A favor de:</h3>
                  <p className="text-xl font-bold text-slate-800">{printData.proveedor.nombre}</p>
                  {printData.proveedor.empresa && <p className="text-slate-600">{printData.proveedor.empresa}</p>}
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
                  <th className="py-3 text-slate-600 font-semibold">Concepto</th>
                  <th className="py-3 text-right text-slate-600 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-800 font-medium">{printData.descripcion || 'Sin descripción'}</td>
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
              <p className="mt-2">Registro de Cuentas por Pagar Interno.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
