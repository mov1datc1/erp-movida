'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, Download, Calendar, Filter, FileSpreadsheet, Printer, CheckSquare, Star, Trash2 } from "lucide-react";
import { createPrefactura, updatePrefactura, markFacturaAsPagada, saveFavoritoCXC, deleteFavoritoCXC } from './actions';

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

  const filteredFacturas = useMemo(() => {
    return facturas.filter(f => {
      // Search
      const matchesSearch = f.folio.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            f.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (f.cliente.empresa && f.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Tab Filter
      if (activeTab === 'por_cobrar') {
        if (f.estatus !== 'PENDIENTE' && f.estatus !== 'VENCIDA') return false;
      } else {
        if (f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA') return false;
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
      alert("Para guardar un favorito necesitas ingresar el Cliente, Monto y Descripción.");
      return;
    }
    const titulo = prompt("Dale un título a este cobro frecuente (Ej: Iguala de Marketing X):");
    if (!titulo) return;
    
    setIsLoading(true);
    const res = await saveFavoritoCXC({
      titulo,
      monto: parseFloat(formData.monto_total),
      descripcion: formData.descripcion,
      cliente_id: formData.cliente_id
    });
    setIsLoading(false);
    if (res.success) {
      alert("¡Favorito guardado!");
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
                  const StatusIcon = statusMap[f.estatus]?.icon || FileText;
                  return (
                    <tr 
                      key={f.id} 
                      onClick={() => openEditModal(f)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-primary">
                        {f.folio}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main">{f.cliente.nombre}</p>
                        {f.cliente.empresa && <p className="text-xs text-text-muted mt-0.5">{f.cliente.empresa}</p>}
                        {f.descripcion && <p className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]">{f.descripcion}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {f.categoria || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-text-main">
                        {formatCurrency(f.monto_total)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${statusMap[f.estatus]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMap[f.estatus]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(f.fecha_emision).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-text-muted">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-0 animate-in zoom-in-95 duration-200 overflow-hidden flex">
            
            {/* Favoritos Sidebar (Only on new) */}
            {(!editingId || showFavoritos) && (
              <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col h-[600px] overflow-hidden hidden md:flex">
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
                {editingId && (printData?.estatus === 'PENDIENTE' || printData?.estatus === 'VENCIDA') && (
                  <button 
                    type="button"
                    onClick={async () => {
                      const registerInFinance = window.confirm('¿Registrar también este ingreso en el módulo de Finanzas automáticamente?');
                      setIsLoading(true);
                      const res = await markFacturaAsPagada(editingId, registerInFinance);
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
                <select 
                  required
                  value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                >
                  <option value="">-- Seleccionar Categoría --</option>
                  <option value="Ventas y Servicios">Ventas y Servicios</option>
                  <option value="Subarrendamiento">Subarrendamiento</option>
                  <option value="Venta de Activos">Venta de Activos</option>
                  <option value="Comisiones">Comisiones</option>
                  <option value="Reembolsos">Reembolsos</option>
                  <option value="Otros">Otros Ingresos</option>
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
