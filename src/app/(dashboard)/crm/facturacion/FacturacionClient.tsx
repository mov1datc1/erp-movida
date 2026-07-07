'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, Loader2, DollarSign, Download, Calendar, Filter, FileSpreadsheet, Printer, CheckSquare, Star, Trash2, ChevronDown, Check, Globe } from "lucide-react";
import { createPrefactura, updatePrefactura, markFacturaAsPagada, saveFavoritoCXC, deleteFavoritoCXC, solicitarFacturacionCFDI, timbrarFacturaCFDI, crearFacturaUSA, crearFacturaMX, eliminarFactura } from './actions';
import { registrarPagoParcialCxC } from '@/app/actions/pagos';
import QRCode from 'react-qr-code';

function numeroALetras(num: number, currency: string = 'USD'): string {
  if (!num || isNaN(num)) return `CERO 00/100 ${currency}`;
  const data = {
    enteros: Math.floor(num),
    centavos: Math.round(num * 100) - (Math.floor(num) * 100),
  };

  function Unidades(num: number) {
    switch (num) {
      case 1: return 'UN';
      case 2: return 'DOS';
      case 3: return 'TRES';
      case 4: return 'CUATRO';
      case 5: return 'CINCO';
      case 6: return 'SEIS';
      case 7: return 'SIETE';
      case 8: return 'OCHO';
      case 9: return 'NUEVE';
      default: return '';
    }
  }

  function Decenas(num: number) {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return 'DIEZ';
          case 1: return 'ONCE';
          case 2: return 'DOCE';
          case 3: return 'TRECE';
          case 4: return 'CATORCE';
          case 5: return 'QUINCE';
          default: return 'DIECI' + Unidades(unidad);
        }
      case 2:
        switch (unidad) {
          case 0: return 'VEINTE';
          default: return 'VEINTI' + Unidades(unidad);
        }
      case 3: return DecenasY('TREINTA', unidad);
      case 4: return DecenasY('CUARENTA', unidad);
      case 5: return DecenasY('CINCUENTA', unidad);
      case 6: return DecenasY('SESENTA', unidad);
      case 7: return DecenasY('SETENTA', unidad);
      case 8: return DecenasY('OCHENTA', unidad);
      case 9: return DecenasY('NOVENTA', unidad);
      case 0: return Unidades(unidad);
      default: return '';
    }
  }

  function DecenasY(strSin: string, numUnidades: number) {
    if (numUnidades > 0) return strSin + ' Y ' + Unidades(numUnidades);
    return strSin;
  }

  function Centenas(num: number) {
    const centenas = Math.floor(num / 100);
    const decenas = num - (centenas * 100);
    switch (centenas) {
      case 1:
        if (decenas > 0) return 'CIENTO ' + Decenas(decenas);
        return 'CIEN';
      case 2: return 'DOSCIENTOS ' + Decenas(decenas);
      case 3: return 'TRESCIENTOS ' + Decenas(decenas);
      case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
      case 5: return 'QUINIENTOS ' + Decenas(decenas);
      case 6: return 'SEISCIENTOS ' + Decenas(decenas);
      case 7: return 'SETECIENTOS ' + Decenas(decenas);
      case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
      case 9: return 'NOVECIENTOS ' + Decenas(decenas);
      default: return Decenas(decenas);
    }
  }

  function Seccion(num: number, divisor: number, strSingular: string, strPlural: string) {
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    let letras = '';
    if (cientos > 0) {
      if (cientos > 1) {
        letras = Centenas(cientos) + ' ' + strPlural;
      } else {
        letras = strSingular;
      }
    }
    if (resto > 0) {
      letras += '';
    }
    return letras;
  }

  function Miles(num: number) {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
    const strCentenas = Centenas(resto);
    if (strMiles === '') return strCentenas;
    return strMiles + ' ' + strCentenas;
  }

  function Millones(num: number) {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - (cientos * divisor);
    const strMillones = Seccion(num, divisor, 'UN MILLON', 'MILLONES');
    const strMiles = Miles(resto);
    if (strMillones === '') return strMiles;
    return strMillones + ' ' + strMiles;
  }

  if (data.enteros === 0) return `CERO ${data.centavos.toString().padStart(2, '0')}/100 ${currency}`;
  return `${Millones(data.enteros).trim()} ${data.centavos.toString().padStart(2, '0')}/100 ${currency}`;
}
export function FacturacionClient({ facturas, clientes, catalog = [], favoritos = [] }: { facturas: any[], clientes: any[], catalog?: any[], favoritos?: any[] }) {
  const [activeTab, setActiveTab] = useState<'por_cobrar' | 'historial' | 'facturacion' | 'usa' | 'mx'>('por_cobrar');
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
    monto_mxn_estimado: '',
    fecha_vencimiento: '', 
    descripcion: '', 
    linea_producto_id: '', 
    categoria: '',
    detalle_horas: '',
    numero_orden: '',
    mes_servicio: '',
    tipo_servicio: '',
    plataformas: ''
  });
  
  // For printing
  const [printData, setPrintData] = useState<any>(null);

  // For partial payments
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [pagoFormData, setPagoFormData] = useState({
    monto: '',
    monto_mxn: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'Transferencia',
    referencia: ''
  });

  // For CFDI Timbrado
  const [isTimbradoModalOpen, setIsTimbradoModalOpen] = useState(false);
  const [timbradoFormData, setTimbradoFormData] = useState({
    uso_cfdi: 'G03',
    regimen_fiscal: '601',
    forma_pago: '99',
    metodo_pago: 'PPD',
    clave_producto: '80141627'
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

  const handleSolicitarCFDI = async (id: string) => {
    setIsLoading(true);
    const res = await solicitarFacturacionCFDI(id);
    setIsLoading(false);
    if(res.success) {
      showNotification('Enviada a Facturación CFDI', 'success');
      setIsModalOpen(false);
      setEditingId(null);
    } else {
      showNotification(res.error || 'Error al procesar CFDI', 'error');
    }
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

  const totalPorCobrar = facturas.filter(f => !f.requiere_cfdi && (f.estatus === 'PENDIENTE' || f.estatus === 'PAGADA_PARCIALMENTE')).reduce((a, b) => {
    const pendiente = b.monto_total - (b.monto_pagado || 0);
    if (b.es_usa && b.monto_mxn_estimado) {
      // Si es USA y tiene un estimado MXN, usamos el porcentaje pendiente del monto total en MXN
      return a + (b.monto_mxn_estimado * (pendiente / b.monto_total));
    }
    return a + pendiente;
  }, 0);
  
  const totalVencido = facturas.filter(f => !f.requiere_cfdi && (f.estatus === 'PENDIENTE' || f.estatus === 'PAGADA_PARCIALMENTE') && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date(new Date().setHours(0,0,0,0))).reduce((a, b) => {
    const pendiente = b.monto_total - (b.monto_pagado || 0);
    if (b.es_usa && b.monto_mxn_estimado) {
      return a + (b.monto_mxn_estimado * (pendiente / b.monto_total));
    }
    return a + pendiente;
  }, 0);

  const filteredFacturas = useMemo(() => {
    return facturas.filter(f => {
      // Search
      const matchesSearch = f.folio.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            f.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (f.cliente.empresa && f.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Tab Filter
      if (activeTab === 'por_cobrar') {
        if (f.requiere_cfdi || f.es_usa || f.es_mx) return false; // En facturación o USA o MX
        if (f.estatus !== 'PENDIENTE' && f.estatus !== 'VENCIDA' && f.estatus !== 'PAGADA_PARCIALMENTE') return false;
      } else if (activeTab === 'facturacion') {
        if (!f.requiere_cfdi || f.es_usa || f.es_mx) return false; // Solo cfdi
      } else if (activeTab === 'usa') {
        if (!f.es_usa) return false; // Solo USA
      } else if (activeTab === 'mx') {
        if (!f.es_mx) return false; // Solo MX
      } else {
        // historial
        if (f.requiere_cfdi && f.estatus_cfdi !== 'FACTURADO' && f.estatus_cfdi !== 'CANCELADO') return false; // Borradores no van al historial
        if (!f.es_usa && !f.es_mx && (f.estatus === 'PENDIENTE' || f.estatus === 'VENCIDA' || f.estatus === 'PAGADA_PARCIALMENTE')) return false;
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
    setFormData({ cliente_id: '', monto_total: '', monto_mxn_estimado: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '', detalle_horas: '', numero_orden: '', mes_servicio: '', tipo_servicio: '', plataformas: '' });
    setShowFavoritos(false);
    setFavSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (factura: any) => {
    setEditingId(factura.id);
    setFormData({
      cliente_id: factura.cliente_id,
      monto_total: factura.monto_total.toString(),
      monto_mxn_estimado: factura.monto_mxn_estimado ? factura.monto_mxn_estimado.toString() : '',
      fecha_vencimiento: factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toISOString().split('T')[0] : '',
      descripcion: factura.descripcion || '',
      linea_producto_id: factura.linea_producto_id || '',
      categoria: factura.categoria || '',
      detalle_horas: factura.detalle_horas || '',
      numero_orden: factura.numero_orden || '',
      mes_servicio: factura.mes_servicio || '',
      tipo_servicio: factura.tipo_servicio || '',
      plataformas: factura.plataformas || ''
    });
    setPrintData(factura);
    setShowFavoritos(false);
    setFavSearchTerm('');
    setIsModalOpen(true);
  };

  const handlePrintInvoice = () => {
    setPrintMode('invoice');
    
    // Cambiar el título del documento temporalmente para que al guardar PDF use este nombre
    const originalTitle = document.title;
    if (printData?.es_usa) {
      document.title = `${printData.numero_usa || printData.folio}`;
    } else if (printData) {
      document.title = `${printData.folio}`;
    }

    setTimeout(() => {
      window.print();
      setPrintMode('none');
      document.title = originalTitle;
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

  const handleEliminarFactura = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.')) return;
    
    setIsLoading(true);
    const res = await eliminarFactura(id);
    setIsLoading(false);
    
    if (res.success) {
      showNotification('Documento eliminado con éxito', 'success');
      if (editingId === id) {
        setIsModalOpen(false);
        setEditingId(null);
      }
    } else {
      showNotification(res.error || 'Error al eliminar', 'error');
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
          
          @page { margin: 0; }
          body { margin-top: 1cm; margin-bottom: 1cm; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print-header print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Facturación</h1>
          <p className="text-text-muted mt-1">Control de prefacturas y pagos de clientes.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          {activeTab === 'usa' && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ cliente_id: '', monto_total: '', monto_mxn_estimado: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '', detalle_horas: '', numero_orden: '', mes_servicio: '', tipo_servicio: '', plataformas: '' });
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Globe className="w-5 h-5" /> Nueva Factura USA
            </button>
          )}
          {activeTab === 'mx' && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ cliente_id: '', monto_total: '', monto_mxn_estimado: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '', detalle_horas: '', numero_orden: '', mes_servicio: '', tipo_servicio: '', plataformas: '' });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-blue-600/20"
            >
              <FileText className="w-5 h-5" /> Nueva Solicitud MX
            </button>
          )}
          <button 
            onClick={openNewModal}
            className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Nueva Prefactura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-cards">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="p-2 bg-white/20 w-fit rounded-xl backdrop-blur-sm mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <p className="text-orange-100 font-medium text-sm">Total Prefacturas</p>
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
          <div className="flex px-6 pt-2 gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('por_cobrar')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'por_cobrar' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Prefacturas
            </button>
            <button
              onClick={() => setActiveTab('facturacion')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'facturacion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Facturación (CFDI 4.0)
            </button>
            <button
              onClick={() => setActiveTab('usa')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'usa' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Facturas USA
            </button>
            <button
              onClick={() => setActiveTab('mx')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'mx' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Facturas MX
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintData(f);
                              setTimeout(() => {
                                handlePrintInvoice();
                              }, 100);
                            }}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Imprimir PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleEliminarFactura(f.id, e)}
                            className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                            fecha_vencimiento: formData.fecha_vencimiento,
                            monto_mxn_estimado: '',
                            detalle_horas: '',
                            numero_orden: '',
                            mes_servicio: '',
                            tipo_servicio: '',
                            plataformas: ''
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
                {activeTab === 'usa' && !editingId ? <Globe className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-primary" />}
                {editingId ? 'Detalles de Factura' : activeTab === 'usa' ? 'Crear Factura USA (USD)' : 'Crear Prefactura Manual'}
              </h2>
              <div className="flex items-center gap-2">
                {editingId && (printData?.estatus === 'PENDIENTE' || printData?.estatus === 'VENCIDA' || printData?.estatus === 'PAGADA_PARCIALMENTE') && (
                  <button 
                    type="button"
                    onClick={() => {
                      setPagoFormData({
                        monto: (printData.monto_total - (printData.monto_pagado || 0)).toString(),
                        monto_mxn: '',
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
                
                {/* CFDI Actions */}
                {editingId && !printData?.requiere_cfdi && (
                  <button 
                    type="button"
                    onClick={async () => {
                      if(confirm("¿Mover esta cuenta a la pestaña de Facturación CFDI?")) {
                         // call action to move to CFDI
                         // We will implement this handler in a bit
                         await handleSolicitarCFDI(editingId);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Solicitar CFDI
                  </button>
                )}

                {editingId && printData?.requiere_cfdi && printData?.estatus_cfdi === 'EN_BORRADOR' && (
                  <button 
                    type="button"
                    onClick={() => setIsTimbradoModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Timbrar (SAT)
                  </button>
                )}

                {editingId && printData?.requiere_cfdi && printData?.estatus_cfdi === 'FACTURADO' && (
                  <div className="flex gap-2">
                    <a 
                      href={printData.url_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </a>
                    <a 
                      href={printData.url_xml}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" /> XML
                    </a>
                  </div>
                )}

                {editingId && (
                  <button 
                    type="button"
                    onClick={handlePrintInvoice}
                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                    title="Imprimir Recibo Interno"
                  >
                    <Printer className="w-5 h-5" />
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
                  categoria: formData.categoria,
                  detalle_horas: formData.detalle_horas,
                  numero_orden: formData.numero_orden
                });
              } else {
                if (activeTab === 'usa') {
                  res = await crearFacturaUSA({
                    cliente_id: formData.cliente_id,
                    monto_total: parseFloat(formData.monto_total),
                    monto_mxn_estimado: formData.monto_mxn_estimado ? parseFloat(formData.monto_mxn_estimado) : undefined,
                    descripcion: formData.descripcion,
                    linea_producto_id: formData.linea_producto_id,
                    categoria: formData.categoria || 'Ventas Internacionales',
                    detalle_horas: formData.detalle_horas,
                    numero_orden: formData.numero_orden
                  });
                } else if (activeTab === 'mx') {
                  res = await crearFacturaMX({
                    cliente_id: formData.cliente_id,
                    monto_total: parseFloat(formData.monto_total),
                    descripcion: formData.descripcion,
                    linea_producto_id: formData.linea_producto_id,
                    categoria: formData.categoria || 'Ventas Nacionales',
                    mes_servicio: formData.mes_servicio,
                    tipo_servicio: formData.tipo_servicio,
                    plataformas: formData.plataformas
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
              }
              
              setIsLoading(false);
              if (res.success) {
                setIsModalOpen(false);
                setFormData({ cliente_id: '', monto_total: '', monto_mxn_estimado: '', fecha_vencimiento: '', descripcion: '', linea_producto_id: '', categoria: '', detalle_horas: '', numero_orden: '', mes_servicio: '', tipo_servicio: '', plataformas: '' });
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monto Total {activeTab === 'usa' || printData?.es_usa ? '(USD)' : ''} *
                  </label>
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

                { (activeTab === 'usa' || printData?.es_usa) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Monto Estimado en MXN *</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="number" 
                          required
                          step="0.01"
                          min="0"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono font-medium bg-white"
                          placeholder="0.00"
                          value={formData.monto_mxn_estimado}
                          onChange={e => setFormData({...formData, monto_mxn_estimado: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de Horas (Ej: 176 H x 70 USD)</label>
                      <input 
                        type="text" 
                        value={formData.detalle_horas}
                        onChange={e => setFormData({...formData, detalle_horas: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-white"
                        placeholder="176 H x 70 USD = $12,320.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Número de Orden (PO / Order #)</label>
                      <input 
                        type="text" 
                        value={formData.numero_orden}
                        onChange={e => setFormData({...formData, numero_orden: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-white"
                        placeholder="GA Telesis Order #: 49824"
                      />
                    </div>
                  </>
                )}

                { (activeTab === 'mx' || printData?.es_mx) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mes de Servicio</label>
                      <input 
                        type="text" 
                        value={formData.mes_servicio}
                        onChange={e => setFormData({...formData, mes_servicio: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm bg-white"
                        placeholder="Ej: JUNIO"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Servicio</label>
                      <input 
                        type="text" 
                        value={formData.tipo_servicio}
                        onChange={e => setFormData({...formData, tipo_servicio: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm bg-white"
                        placeholder="Ej: PUBLICIDAD ADS"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Plataformas (Opcional)</label>
                      <input 
                        type="text" 
                        value={formData.plataformas}
                        onChange={e => setFormData({...formData, plataformas: e.target.value})}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm bg-white"
                        placeholder="Ej: GOOGLE ADS Y META ADS"
                      />
                    </div>
                  </>
                )}
                
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
                monto_mxn: printData.es_usa && pagoFormData.monto_mxn ? parseFloat(pagoFormData.monto_mxn) : undefined,
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

                {printData.es_usa && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto en Pesos (MXN) *</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        min="0.01"
                        value={pagoFormData.monto_mxn}
                        onChange={e => setPagoFormData({...pagoFormData, monto_mxn: e.target.value})}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                )}
                
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

      {/* Modal Timbrado CFDI 4.0 (Paso Intermedio del SAT) */}
      {isTimbradoModalOpen && printData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Opciones de Timbrado SAT (CFDI 4.0)
                </h2>
                <p className="text-sm text-indigo-700/70 mt-1">
                  Revisa los datos fiscales obligatorios para timbrar la factura de <strong>{printData.cliente.nombre}</strong>.
                </p>
              </div>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              
              const res = await timbrarFacturaCFDI(editingId!, timbradoFormData);
              
              setIsLoading(false);
              
              if(res.success) {
                showNotification('Factura timbrada exitosamente (CFDI 4.0)', 'success');
                setIsTimbradoModalOpen(false);
                setIsModalOpen(false);
                setEditingId(null);
              } else {
                showNotification(res.error || 'Error al timbrar factura', 'error');
              }
            }} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Datos del Comprobante</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Uso de CFDI</label>
                    <select 
                      required
                      value={timbradoFormData.uso_cfdi}
                      onChange={e => setTimbradoFormData({...timbradoFormData, uso_cfdi: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="G01">G01 - Adquisición de mercancías</option>
                      <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="I04">I04 - Equipo de computo y accesorios</option>
                      <option value="P01">P01 - Por definir</option>
                      <option value="S01">S01 - Sin efectos fiscales</option>
                      <option value="CP01">CP01 - Pagos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Régimen Fiscal (Receptor)</label>
                    <select 
                      required
                      value={timbradoFormData.regimen_fiscal}
                      onChange={e => setTimbradoFormData({...timbradoFormData, regimen_fiscal: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                      <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                      <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                    </select>
                  </div>

                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Opciones de Pago</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pago</label>
                    <select 
                      required
                      value={timbradoFormData.forma_pago}
                      onChange={e => setTimbradoFormData({...timbradoFormData, forma_pago: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="01">01 - Efectivo</option>
                      <option value="02">02 - Cheque nominativo</option>
                      <option value="03">03 - Transferencia electrónica de fondos</option>
                      <option value="04">04 - Tarjeta de crédito</option>
                      <option value="28">28 - Tarjeta de débito</option>
                      <option value="99">99 - Por definir</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                    <select 
                      required
                      value={timbradoFormData.metodo_pago}
                      onChange={e => setTimbradoFormData({...timbradoFormData, metodo_pago: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="PUE">PUE - Pago en una sola exhibición</option>
                      <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1">Clave SAT (Producto / Servicio)</label>
                <input 
                  type="text" 
                  required
                  value={timbradoFormData.clave_producto}
                  onChange={e => setTimbradoFormData({...timbradoFormData, clave_producto: e.target.value})}
                  className="w-full md:w-1/2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                  placeholder="Ej: 80141627"
                />
                <p className="text-xs text-slate-500 mt-1">Por defecto: 80141627 (Servicios de publicidad y relaciones públicas)</p>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsTimbradoModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar y Timbrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bloque imprimible de factura (oculto en pantalla) */}
      <div className="hidden print:block p-8 print-invoice-wrapper">
        {printData && (
          printData.es_usa ? (
            <div className="usa-invoice text-[12px] leading-tight font-sans text-black">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <img src="/logo.png" className="h-24 w-auto object-contain mb-4" alt="Movida TCI" onError={(e) => e.currentTarget.style.display = 'none'} />
                   <p><strong className="text-sm">Movida TCI</strong></p>
                   <p>Illinois 27, Ofic 602.</p>
                   <p>Napoles, Benito Juarez</p>
                   <p>Ciudad de México, México.C.P.03810</p>
                   <p>Teléfono: + 52 55 1069 4443</p>
                   <p>RFC: DES170116QX1</p>
                   <p className="text-blue-500 underline mt-1">www.movidatci.mx</p>
                 </div>
                 <div className="border-[3px] border-blue-500 rounded-3xl p-4 w-[40%] text-center">
                   <h2 className="font-bold text-xl mb-3">FACTURA</h2>
                   <p className="font-bold text-[11px]">Folio Fiscal:</p>
                   <p className="mb-2 text-[10px] break-all">{printData.folio_fiscal}</p>
                   <p className="font-bold text-[11px]">Factura Número:</p>
                   <p className="text-lg font-bold mb-2">{printData.numero_usa}</p>
                   <p className="font-bold text-[11px]">Fecha:</p>
                   <p>{new Date(printData.fecha_emision).toLocaleDateString('es-MX', {day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                 </div>
              </div>
              
              {/* Client Details */}
              <div className="border-[3px] border-blue-500 rounded-2xl mb-4 overflow-hidden">
                <table className="w-full text-left bg-[#e2e8f0]">
                  <tbody>
                    <tr className="bg-[#cbd5e1] border-b border-white">
                      <td className="p-1 w-36 font-bold">Nombre o Razón Social:</td>
                      <td className="p-1 font-bold">{printData.cliente.razon_social || printData.cliente.empresa || printData.cliente.nombre}</td>
                      <td className="p-1 text-right pr-4 font-bold">RFC: XEXX010101000</td>
                    </tr>
                    <tr className="border-b border-white">
                      <td className="p-1 font-bold">Cliente:</td>
                      <td className="p-1" colSpan={2}>{printData.cliente.id.substring(0,8).toUpperCase()}</td>
                    </tr>
                    <tr className="bg-[#cbd5e1] border-b border-white">
                      <td className="p-1 font-bold">Dirección:</td>
                      <td className="p-1" colSpan={2}>{printData.cliente.direccion || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-white">
                      <td className="p-1 font-bold">Colonia:</td>
                      <td className="p-1" colSpan={2}>{printData.cliente.colonia || '-'}</td>
                    </tr>
                    <tr className="bg-[#cbd5e1] border-b border-white">
                      <td className="p-1 font-bold">Ciudad:</td>
                      <td className="p-1" colSpan={2}>{printData.cliente.ciudad || '-'}</td>
                    </tr>
                    <tr>
                      <td className="p-1 font-bold">C.p:</td>
                      <td className="p-1" colSpan={2}>{printData.cliente.codigo_postal || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Line Items */}
              <div className="border border-blue-500 rounded mb-4 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#3b82f6] text-white font-bold">
                    <tr>
                      <th className="p-1 w-12 text-center border-r border-blue-400">Cant</th>
                      <th className="p-1 border-r border-blue-400">Descripción</th>
                      <th className="p-1 text-right border-r border-blue-400">Valor Unitario</th>
                      <th className="p-1 text-right">Importe USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 text-center font-bold border-r border-slate-300">1</td>
                      <td className="p-1 border-r border-slate-300">{printData.descripcion}</td>
                      <td className="p-1 text-right font-bold border-r border-slate-300">$ {formatCurrency(printData.monto_total).replace('$', '')}</td>
                      <td className="p-1 text-right font-bold">$ {formatCurrency(printData.monto_total).replace('$', '')}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 border-r border-slate-300"></td>
                      <td className="p-1 text-slate-700 border-r border-slate-300">
                        {printData.detalle_horas && <p className="mb-0.5">Description: {printData.detalle_horas}</p>}
                        {printData.numero_orden && <p className="text-center font-bold">{printData.numero_orden}</p>}
                        {!printData.detalle_horas && !printData.numero_orden && <span className="opacity-0">-</span>}
                      </td>
                      <td className="p-1 border-r border-slate-300"></td>
                      <td className="p-1"></td>
                    </tr>
                    {/* dummy rows */}
                    {[1,2,3,4,5].map(i => (
                       <tr key={i} className="border-b border-slate-300"><td className="p-3 border-r border-slate-300"></td><td className="border-r border-slate-300"></td><td className="border-r border-slate-300"></td><td></td></tr>
                    ))}
                    <tr className="bg-slate-200 border-t border-slate-300"><td className="p-3 border-r border-slate-300"></td><td className="border-r border-slate-300"></td><td className="border-r border-slate-300"></td><td></td></tr>
                  </tbody>
                </table>
              </div>
              
              {/* Totals */}
              <div className="flex justify-between mt-4 items-center">
                <div className="w-1/2">
                  <p className="font-bold text-center mb-1">Monto en Letras</p>
                  <p className="text-center italic text-xs">{numeroALetras(printData.monto_total, 'USD')}</p>
                </div>
                <div className="w-1/3">
                  <table className="w-full text-right font-bold bg-[#e2e8f0]">
                     <tbody>
                       <tr className="border-b border-white"><td className="p-1 text-left w-24">Sub Total:</td><td className="p-1">$ {formatCurrency(printData.monto_total).replace('$', '')}</td></tr>
                       <tr className="border-b border-white"><td className="p-1 text-left">Total IVA:</td><td className="p-1">$ -</td></tr>
                       <tr><td className="p-1 text-left">Total:</td><td className="p-1">$ {formatCurrency(printData.monto_total).replace('$', '')}</td></tr>
                     </tbody>
                  </table>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex mt-8">
                 <div className="w-1/4">
                   <QRCode value={printData.folio_fiscal || 'N/A'} size={140} />
                 </div>
                 <div className="w-3/4 flex flex-col justify-end text-[11px]">
                   <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1 mb-8">
                     <div className="font-bold">Moneda:</div><div>USD</div>
                     <div className="font-bold">Forma de pago:</div><div>Transferencia electrónica de fondos</div>
                     <div className="font-bold">Método de pago:</div><div>Pago en una sola exhibición</div>
                   </div>
                   <div className="text-center text-blue-500 underline text-xs">
                     <p>facturacion@movidatci.mx</p>
                     <p>www.movidatci.mx</p>
                   </div>
                 </div>
              </div>
              
            </div>
          ) : printData.es_mx ? (
            <div className="mx-invoice text-[12px] leading-tight font-sans text-black relative flex bg-white min-h-[1056px]">
                {/* Left blue decorative sidebar */}
                <div className="absolute left-0 top-0 bottom-0 w-[40px] bg-[#4b7cbb] z-0 overflow-hidden flex flex-col">
                  {/* Decorative geometric shapes */}
                  <div className="h-32 bg-[#3161a0] w-full transform -skew-y-12 origin-top-left mt-10"></div>
                  <div className="h-48 bg-[#6494cd] w-full transform skew-y-12 origin-bottom-right mt-20 opacity-50"></div>
                  <div className="h-64 bg-[#234c85] w-full transform -skew-y-12 origin-top-left mt-auto mb-20 opacity-80"></div>
                </div>
                
                <div className="pl-[60px] pr-8 py-8 w-full z-10 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-12">
                     <div className="bg-[#004aad] p-6 text-white text-center w-48 h-64 flex flex-col items-center justify-center shadow-lg -mt-8">
                       <img src="/logo.png" className="w-full h-auto object-contain brightness-0 invert" alt="Movida TCI" onError={(e) => e.currentTarget.style.display = 'none'} />
                     </div>
                     <div className="text-right pt-16 pr-4">
                       <h1 className="text-[#004aad] text-5xl font-black leading-[1.1] tracking-wide">SOLICITUD<br/>DE PAGO</h1>
                     </div>
                  </div>
                  
                  {/* Info details */}
                  <div className="flex justify-between mb-8 pr-4">
                     <div className="w-1/2">
                       <p className="text-[#004aad] font-bold text-lg mb-1">CLIENTE:</p>
                       <p className="font-bold text-lg">{printData.cliente.razon_social || printData.cliente.empresa || printData.cliente.nombre}</p>
                       <p className="text-[#004aad] font-bold text-xl mt-4 tracking-wide">Nº: {printData.numero_mx}</p>
                     </div>
                     <div className="w-1/2 text-right text-sm">
                       <p className="text-[#004aad] font-bold text-lg mb-3">DETALLES DE SERVICIO:</p>
                       <p className="mb-1.5"><strong className="text-[#004aad]">FECHA: </strong> 
                         {(() => {
                           const d = new Date(printData.fecha_emision);
                           const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                           return `${d.getDate()}/${months[d.getMonth()]} /${d.getFullYear()}`;
                         })()}
                       </p>
                       {printData.mes_servicio && <p className="mb-1.5"><strong className="text-[#004aad]">MES DE SERVICIO: </strong> {printData.mes_servicio.toUpperCase()}</p>}
                       {printData.tipo_servicio && <p className="mb-1.5"><strong className="text-[#004aad]">TIPO DE SERVICIO: </strong> {printData.tipo_servicio.toUpperCase()}</p>}
                       {printData.plataformas && <p><strong className="text-[#004aad]">PLATAFORMAS: </strong> {printData.plataformas.toUpperCase()}</p>}
                     </div>
                  </div>
                  
                  {/* Table */}
                  <table className="w-full text-center mb-8">
                     <thead className="bg-[#0052b4] text-white">
                        <tr>
                          <th className="py-2.5 px-4 text-left font-bold text-sm tracking-widest">DESCRIPCIÓN</th>
                          <th className="py-2.5 px-4 font-bold text-sm tracking-widest">CANTIDAD</th>
                          <th className="py-2.5 px-4 text-right font-bold text-sm tracking-widest">MONTO</th>
                        </tr>
                     </thead>
                     <tbody className="bg-[#eef2f6]">
                        <tr>
                          <td className="py-5 px-4 text-left font-bold text-[13px] leading-relaxed max-w-[280px] whitespace-pre-wrap">
                            {printData.descripcion}
                          </td>
                          <td className="py-5 px-4 font-bold text-base">1</td>
                          <td className="py-5 px-4 text-right font-bold text-base">MXN${formatCurrency(printData.monto_total).replace('$', '')}</td>
                        </tr>
                        <tr className="h-40"><td colSpan={3}></td></tr>
                     </tbody>
                  </table>
                  
                  <div className="border-t border-slate-200 w-full mb-6"></div>
                  
                  {/* Footer & Totals */}
                  <div className="flex justify-between items-start flex-grow">
                     <div className="w-[55%] pr-8">
                        <p className="font-bold text-base mb-1">CONDICIONES:</p>
                        <p className="text-[13px] text-slate-700">Pago por cada mes una exhibición del 100%</p>
                        
                        <p className="font-bold text-[13px] mt-10 mb-3 uppercase">ESTO ES UN RECORDATORIO DE PAGO, SE DESEA QUE SEA REALIZADO EN LOS PRIMEROS 5 DÍAS HÁBILES DE CADA MES.</p>
                        <p className="text-[13px] text-slate-600 mb-0.5">¿Alguna pregunta?</p>
                        <p className="text-[13px] text-slate-600">Envíanos un correo a:  info@movidatci.com</p>
                     </div>
                     <div className="w-[45%] flex flex-col justify-between h-full">
                        <table className="w-full text-right text-[13px] text-slate-600">
                           <tbody>
                             <tr><td className="py-1.5 pr-8">Subtotal</td><td className="py-1.5 w-28">${formatCurrency(printData.monto_total).replace('$', '')}</td></tr>
                             <tr><td className="py-1.5 pr-8">IVA::</td><td className="py-1.5 w-28">$0</td></tr>
                             <tr><td className="py-4 pr-8 font-bold text-base text-black">TOTAL MXN:</td><td className="py-4 font-bold text-base text-black w-28">${formatCurrency(printData.monto_total).replace('$', '')}</td></tr>
                           </tbody>
                        </table>
                        <div className="text-right mt-auto pb-4">
                           <h2 className="text-[#004aad] text-6xl font-black tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>¡GRACIAS!</h2>
                        </div>
                     </div>
                  </div>
                  
                  {/* Bottom Border & Address */}
                  <div className="mt-8">
                    <div className="border-t-[3px] border-[#004aad] w-full mx-auto pb-3"></div>
                    <p className="text-center text-[13px] font-medium text-slate-700">
                      Illinois 27 Colonia Nápoles  03840 CDMX
                    </p>
                  </div>
                </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b-2 border-slate-200 pb-6 mb-6">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">FACTURA {printData.folio}</h1>
                <div className="flex justify-between items-start mt-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Facturado a:</h3>
                    <p className="text-xl font-bold text-slate-800">{printData.cliente.razon_social || printData.cliente.nombre}</p>
                    {printData.cliente.empresa && <p className="text-slate-600 font-medium">{printData.cliente.empresa}</p>}
                    <p className="text-slate-600 mt-1">
                      {printData.cliente.direccion ? `${printData.cliente.direccion}, ` : ''}
                      {printData.cliente.colonia ? `${printData.cliente.colonia}, ` : ''}
                      {printData.cliente.ciudad ? `${printData.cliente.ciudad}, ` : ''}
                      {printData.cliente.codigo_postal ? `C.P. ${printData.cliente.codigo_postal}` : ''}
                    </p>
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
          )
        )}
      </div>
    </div>
  );
}
