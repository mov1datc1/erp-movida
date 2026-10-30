'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import {
  Sparkles,
  Upload,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Copy,
  Check,
  Search,
  RefreshCw,
  ExternalLink,
  Info,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  Building,
  Tag,
  SlidersHorizontal,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { ComprobanteGastoView, GastosBuzonStore } from '@/types/gastosAgent';
import {
  analizarYRegistrarComprobanteAction,
  conciliarComprobanteAction,
  descartarComprobanteAction,
  reactivarComprobanteAction,
} from '../gastosActions';

interface CuentaPorPagarOption {
  id: string;
  folio: string;
  monto_total: number;
  monto_pagado: number;
  proveedor?: {
    nombre: string;
  };
  descripcion?: string | null;
}

interface ProyectoOption {
  id: string;
  nombre: string;
  codigo?: string | null;
}

interface Props {
  initialStore: GastosBuzonStore;
  cuentasPorPagar: CuentaPorPagarOption[];
  proyectos: ProyectoOption[];
}

export default function AgenteGastosWhatsAppView({
  initialStore,
  cuentasPorPagar,
  proyectos,
}: Props) {
  const [store, setStore] = useState<GastosBuzonStore>(initialStore);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [activeTab, setActiveTab] = useState<'TODOS' | 'PENDIENTES' | 'CONCILIADOS' | 'EGRESOS' | 'INGRESOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropzone y subida manual / pegado de portapapeles
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [pastedMime, setPastedMime] = useState<string>('image/jpeg');
  const [notaContexto, setNotaContexto] = useState('');
  const [remitenteManual, setRemitenteManual] = useState('Ricardo Zerpa');
  const [chatNombre, setChatNombre] = useState('Gastos & Fi Movida');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Conciliación
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteGastoView | null>(null);
  const [conciliarModo, setConciliarModo] = useState<'CXP' | 'MOVIMIENTO'>('CXP');
  const [selectedCxpId, setSelectedCxpId] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Honorarios y Desarrollo');
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Copiado al portapapeles
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar pegado global de imágenes con Ctrl+V / Cmd+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              const base64 = loadEvt.target?.result as string;
              setPastedImage(base64);
              setPastedMime(file.type || 'image/jpeg');
              setStatusMessage({
                type: 'success',
                text: 'Imagen pegada desde el portapapeles. Agrega una nota opcional y presiona "Analizar con IA".',
              });
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64 = loadEvt.target?.result as string;
      setPastedImage(base64);
      setPastedMime(file.type || 'image/jpeg');
      setStatusMessage({
        type: 'success',
        text: 'Archivo cargado. Presiona "Analizar con IA" para procesar el comprobante.',
      });
    };
    reader.readAsDataURL(file);
  };

  const ejecutarAnalisisVision = async () => {
    if (!pastedImage) return;

    setIsAnalyzing(true);
    setStatusMessage(null);

    try {
      const result = await analizarYRegistrarComprobanteAction({
        imageBase64: pastedImage,
        mimeType: pastedMime,
        notaContexto: notaContexto.trim() || undefined,
        remitente: remitenteManual.trim() || undefined,
        chatNombre: chatNombre.trim() || undefined,
      });

      if (!result.success || !result.comprobantes) {
        setStatusMessage({
          type: 'error',
          text: result.error || 'No se pudo procesar la imagen.',
        });
      } else {
        setStore((prev) => ({
          ...prev,
          comprobantes: [...(result.comprobantes || []), ...prev.comprobantes],
        }));
        setPastedImage(null);
        setNotaContexto('');
        setStatusMessage({
          type: 'success',
          text: `¡Éxito! Se detectaron y registraron ${result.comprobantes.length} comprobante(s) en el buzón.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error inesperado durante el análisis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleOpenConciliarModal = (comp: ComprobanteGastoView) => {
    setSelectedComprobante(comp);
    // Intentar pre-seleccionar una CXP si el nombre de proveedor o monto coincide
    const matchingCxp = cuentasPorPagar.find((cxp) => {
      const pendiente = cxp.monto_total - cxp.monto_pagado;
      const coincideMonto = Math.abs(pendiente - comp.monto) < 1;
      const coincideProv =
        comp.proveedor_nombre &&
        cxp.proveedor?.nombre?.toLowerCase().includes(comp.proveedor_nombre.toLowerCase());
      return coincideMonto || coincideProv;
    });

    if (matchingCxp) {
      setSelectedCxpId(matchingCxp.id);
      setConciliarModo('CXP');
    } else {
      setSelectedCxpId(cuentasPorPagar[0]?.id || '');
      setConciliarModo('CXP');
    }

    if (comp.proyecto_nombre) {
      const matchProj = proyectos.find((p) =>
        comp.proyecto_nombre?.toLowerCase().includes(p.nombre.toLowerCase())
      );
      if (matchProj) setSelectedProyectoId(matchProj.id);
    }
  };

  const handleConfirmConciliacion = async () => {
    if (!selectedComprobante) return;

    setIsReconciling(true);
    try {
      const res = await conciliarComprobanteAction({
        comprobanteId: selectedComprobante.id,
        cuentaPorPagarId: conciliarModo === 'CXP' ? selectedCxpId : undefined,
        crearMovimientoFinanciero: true,
        categoria: selectedCategoria,
        proyectoId: selectedProyectoId || undefined,
        usuario: 'Jonathan Palacios',
      });

      if (res.success) {
        setStore((prev) => ({
          ...prev,
          comprobantes: prev.comprobantes.map((c) =>
            c.id === selectedComprobante.id
              ? {
                  ...c,
                  estado: 'CONCILIADO',
                  conciliadoEn: new Date().toISOString(),
                  conciliadoPor: 'Jonathan Palacios',
                  cuenta_por_pagar_id: conciliarModo === 'CXP' ? selectedCxpId : undefined,
                }
              : c
          ),
        }));
        setSelectedComprobante(null);
        setStatusMessage({
          type: 'success',
          text: res.message || 'Comprobante conciliado y registrado en el ERP exitosamente.',
        });
      } else {
        alert(res.error || 'Error al conciliar');
      }
    } finally {
      setIsReconciling(false);
    }
  };

  const handleDescartar = async (comp: ComprobanteGastoView) => {
    if (!confirm(`¿Deseas descartar el comprobante ${comp.folio}?`)) return;

    const res = await descartarComprobanteAction(comp.id, 'Descartado manualmente');
    if (res.success) {
      setStore((prev) => ({
        ...prev,
        comprobantes: prev.comprobantes.map((c) =>
          c.id === comp.id ? { ...c, estado: 'DESCARTADO' } : c
        ),
      }));
    }
  };

  const handleReactivar = async (comp: ComprobanteGastoView) => {
    const res = await reactivarComprobanteAction(comp.id);
    if (res.success) {
      setStore((prev) => ({
        ...prev,
        comprobantes: prev.comprobantes.map((c) =>
          c.id === comp.id ? { ...c, estado: 'PENDIENTE' } : c
        ),
      }));
    }
  };

  // Cálculos estadísticos
  const totalComprobantes = store.comprobantes.length;
  const pendientes = store.comprobantes.filter((c) => c.estado === 'PENDIENTE');
  const conciliados = store.comprobantes.filter((c) => c.estado === 'CONCILIADO');
  const descartados = store.comprobantes.filter((c) => c.estado === 'DESCARTADO');

  const montoPendienteUSD = pendientes
    .filter((c) => c.moneda === 'USD')
    .reduce((sum, c) => sum + c.monto, 0);
  const montoConciliadoUSD = conciliados
    .filter((c) => c.moneda === 'USD')
    .reduce((sum, c) => sum + c.monto, 0);

  // Filtrado de la lista
  const comprobantesFiltrados = store.comprobantes.filter((c) => {
    if (activeTab === 'PENDIENTES' && c.estado !== 'PENDIENTE') return false;
    if (activeTab === 'CONCILIADOS' && c.estado !== 'CONCILIADO') return false;
    if (activeTab === 'EGRESOS' && c.tipo !== 'EGRESO') return false;
    if (activeTab === 'INGRESOS' && c.tipo !== 'INGRESO') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchFolio = c.folio.toLowerCase().includes(q);
      const matchDest = c.destinatario.toLowerCase().includes(q);
      const matchPagador = c.pagador.toLowerCase().includes(q);
      const matchRef = c.referencia.toLowerCase().includes(q);
      const matchNota = c.nota_whatsapp?.toLowerCase().includes(q);
      const matchProv = c.proveedor_nombre?.toLowerCase().includes(q);
      const matchProj = c.proyecto_nombre?.toLowerCase().includes(q);
      return matchFolio || matchDest || matchPagador || matchRef || matchNota || matchProv || matchProj;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Encabezado del Agente */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Agente A20 · Finanzas & WhatsApp
              </span>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Multimodal Vision
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Buzón Inteligente de Gastos, Pagos y Conciliación
            </h2>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              Recibe capturas de WhatsApp (Zelle, SPEI, BofA, Binance/USDT) compartidas por Ricardo y Jonathan. Extrae
              monto, beneficiario, cuenta, concepto y folio para conciliar en 1 clic contra Cuentas por Pagar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowWebhookGuide(!showWebhookGuide)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/15 flex items-center gap-2 backdrop-blur-sm"
            >
              <Info className="w-4 h-4 text-emerald-400" />
              {showWebhookGuide ? 'Ocultar Webhook' : 'Ver Webhook WhatsApp'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Subir / Pegar Captura
            </button>
          </div>
        </div>

        {/* Panel Desplegable: Guía de Conexión Webhook de WhatsApp */}
        {showWebhookGuide && (
          <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="font-bold text-white mb-1.5 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Endpoint de Webhook Oficial (Meta Cloud API)
              </p>
              <div className="bg-black/40 px-3 py-2 rounded-lg font-mono text-emerald-300 select-all flex justify-between items-center break-all">
                <span>https://erp-movida.vercel.app/api/webhooks/whatsapp</span>
                <button
                  onClick={() => handleCopy('https://erp-movida.vercel.app/api/webhooks/whatsapp', 'webhook-url')}
                  className="p-1 hover:text-white"
                >
                  {copiedRef === 'webhook-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-slate-400">
                Token de Verificación: <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">movida_wh_token_2026</code>
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-center">
              <p className="font-bold text-white mb-1">⚡ Pegado Inmediato desde WhatsApp Desktop / Web</p>
              <p className="text-slate-300 leading-relaxed">
                También puedes copiar cualquier captura de tu chat en WhatsApp con <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-white font-mono">Cmd+C</kbd> / <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-white font-mono">Ctrl+C</kbd> y presionar <kbd className="px-1.5 py-0.5 bg-white/15 rounded text-white font-mono">Cmd+V</kbd> aquí en esta pantalla para que la IA extraiga los datos al instante.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total en Buzón</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalComprobantes}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Comprobantes procesados</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Por Conciliar</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">{pendientes.length}</h3>
            <p className="text-xs font-medium text-amber-600/80 mt-0.5">
              ${montoPendienteUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Conciliados</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{conciliados.length}</h3>
            <p className="text-xs font-medium text-emerald-600/80 mt-0.5">
              ${montoConciliadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descartados</p>
            <h3 className="text-2xl font-black text-slate-600 mt-1">{descartados.length}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Duplicados o cancelados</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Zona de Pegado / Subida Interactiva */}
      <div className="bg-white rounded-3xl border-2 border-dashed border-indigo-200/80 hover:border-indigo-400 transition-colors p-6 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {!pastedImage ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-6 text-center cursor-pointer group"
          >
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Haz clic para seleccionar o presiona <kbd className="px-2 py-0.5 bg-slate-100 border rounded text-xs font-mono text-slate-700">Cmd+V</kbd> para pegar captura del chat
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Soporta capturas de Zelle, transferencias SPEI, Binance, cheques o facturas (PNG, JPG, WebP)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Captura lista para análisis con OpenAI GPT-4o-mini Vision
              </span>
              <button
                onClick={() => setPastedImage(null)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Eliminar imagen
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 max-h-52 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                {/* Vista previa de la captura */}
                <img
                  src={pastedImage}
                  alt="Captura de comprobante"
                  className="max-h-52 w-auto object-contain rounded-xl"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Remitente en WhatsApp</label>
                    <input
                      type="text"
                      value={remitenteManual}
                      onChange={(e) => setRemitenteManual(e.target.value)}
                      placeholder="Ej. Ricardo Zerpa"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Chat</label>
                    <input
                      type="text"
                      value={chatNombre}
                      onChange={(e) => setChatNombre(e.target.value)}
                      placeholder="Ej. Gastos & Fi Movida"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nota o Mensaje del Chat (opcional, ayuda al modelo a contextualizar)
                  </label>
                  <input
                    type="text"
                    value={notaContexto}
                    onChange={(e) => setNotaContexto(e.target.value)}
                    placeholder="Ej. Pago Joel.. o Pago a Deproinf..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={ejecutarAnalisisVision}
                    disabled={isAnalyzing}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Extrayendo datos con IA Multimodal...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Procesar Comprobante con IA
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setPastedImage(null)}
                    disabled={isAnalyzing}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('TODOS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'TODOS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalComprobantes})
          </button>
          <button
            onClick={() => setActiveTab('PENDIENTES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'PENDIENTES'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pendientes ({pendientes.length})
          </button>
          <button
            onClick={() => setActiveTab('CONCILIADOS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'CONCILIADOS'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Conciliados ({conciliados.length})
          </button>
          <button
            onClick={() => setActiveTab('EGRESOS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'EGRESOS'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Egresos
          </button>
          <button
            onClick={() => setActiveTab('INGRESOS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'INGRESOS'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Ingresos
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, nota, banco..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid de Tarjetas de Comprobantes Extraídos */}
      {comprobantesFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700">No hay comprobantes en esta vista</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Sube o pega una captura con el botón superior, o envía una imagen al número técnico de WhatsApp para que el agente la procese automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comprobantesFiltrados.map((comp) => {
            const esEgreso = comp.tipo === 'EGRESO';
            const esConciliado = comp.estado === 'CONCILIADO';
            const esDescartado = comp.estado === 'DESCARTADO';

            return (
              <div
                key={comp.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                  esConciliado
                    ? 'border-emerald-200/90 bg-emerald-50/10'
                    : esDescartado
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                {/* Header de la tarjeta */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {comp.folio}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                          esEgreso
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {esEgreso ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {comp.tipo}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {comp.medio_pago}
                      </span>
                    </div>

                    <div>
                      {esConciliado && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Conciliado
                        </span>
                      )}
                      {!esConciliado && !esDescartado && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pendiente
                        </span>
                      )}
                      {esDescartado && (
                        <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                          Descartado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Monto principal y Beneficiario */}
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                        <span>${comp.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs font-bold text-slate-500">{comp.moneda}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {comp.fecha} {comp.hora ? `· ${comp.hora}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hacia / Beneficiario</p>
                      <p className="text-sm font-extrabold text-slate-800">{comp.destinatario}</p>
                      {comp.titular_enrolado && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          {comp.titular_enrolado}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Datos extraídos por la IA */}
                  <div className="space-y-2 text-xs text-slate-600 mb-4">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Pagador / Origen</span>
                        <span className="font-bold text-slate-700 truncate block">{comp.pagador}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Referencia / Confirmación</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold text-slate-800 text-[11px] truncate">
                            {comp.referencia}
                          </span>
                          <button
                            onClick={() => handleCopy(comp.referencia, comp.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copiar referencia"
                          >
                            {copiedRef === comp.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nota de WhatsApp */}
                    {comp.nota_whatsapp && (
                      <div className="flex items-start gap-2 bg-indigo-50/60 text-indigo-900 p-2.5 rounded-xl border border-indigo-100/80">
                        <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <span className="font-bold block text-indigo-950">Nota de WhatsApp:</span>
                          <span className="italic">"{comp.nota_whatsapp}"</span>
                          {comp.remitente_chat && (
                            <span className="text-indigo-400 text-[10px] ml-1">— {comp.remitente_chat}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inferencia de Proyecto / Proveedor */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {comp.proyecto_nombre && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" /> {comp.proyecto_nombre}
                        </span>
                      )}
                      {comp.proveedor_nombre && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" /> Sugerido: {comp.proveedor_nombre}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-md ml-auto">
                        Confianza IA: {Math.round(comp.confianza * 100)}%
                      </span>
                    </div>

                    {/* Información de conciliación previa si ya ocurrió */}
                    {esConciliado && (
                      <div className="bg-emerald-50/80 border border-emerald-200 p-2 rounded-xl text-[11px] text-emerald-900 mt-2">
                        <p className="font-bold flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {comp.cuenta_por_pagar_folio
                            ? `Conciliado con Cuenta por Pagar ${comp.cuenta_por_pagar_folio}`
                            : 'Registrado en Movimientos Financieros'}
                        </p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          Autorizado por {comp.conciliadoPor || 'Jonathan Palacios'} ·{' '}
                          {comp.conciliadoEn ? new Date(comp.conciliadoEn).toLocaleDateString('es-MX') : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  {!esConciliado && !esDescartado && (
                    <>
                      <button
                        onClick={() => handleOpenConciliarModal(comp)}
                        className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Conciliar en 1 Clic
                      </button>
                      <button
                        onClick={() => handleDescartar(comp)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
                        title="Descartar comprobante"
                      >
                        Descartar
                      </button>
                    </>
                  )}

                  {esDescartado && (
                    <button
                      onClick={() => handleReactivar(comp)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Reactivar Comprobante
                    </button>
                  )}

                  {esConciliado && (
                    <div className="w-full flex justify-between items-center text-xs text-slate-400">
                      <span>✓ Registro completado en ERP</span>
                      <button
                        onClick={() => handleReactivar(comp)}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Reabrir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Conciliación en 1 Clic */}
      {selectedComprobante && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                  {selectedComprobante.folio}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Conciliación Financiera en ERP</h3>
              </div>
              <button
                onClick={() => setSelectedComprobante(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del movimiento */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Monto comprobante:</span>
                <span className="text-lg font-black text-slate-900">
                  ${selectedComprobante.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  {selectedComprobante.moneda}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Destinatario:</span>
                <span className="font-bold text-slate-800">{selectedComprobante.destinatario}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Medio / Referencia:</span>
                <span className="font-mono text-slate-700">
                  {selectedComprobante.medio_pago} · {selectedComprobante.referencia}
                </span>
              </div>
              {selectedComprobante.nota_whatsapp && (
                <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-xl mt-2 font-medium">
                  "{selectedComprobante.nota_whatsapp}"
                </div>
              )}
            </div>

            {/* Selector de Modo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                ¿Cómo deseas asentar este movimiento?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConciliarModo('CXP')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                    conciliarModo === 'CXP'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-extrabold flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" /> Vincular a CXP
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal mt-1">
                    Amortiza una Cuenta por Pagar abierta a un proveedor.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConciliarModo('MOVIMIENTO')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                    conciliarModo === 'MOVIMIENTO'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-extrabold flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" /> Movimiento Directo
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal mt-1">
                    Registra el egreso/ingreso general en flujo contable.
                  </span>
                </button>
              </div>
            </div>

            {/* Opciones según el modo */}
            {conciliarModo === 'CXP' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecciona la Cuenta por Pagar a abonar ({cuentasPorPagar.length} abiertas)
                </label>
                {cuentasPorPagar.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">
                    No hay Cuentas por Pagar pendientes en el sistema. Puedes registrarlo como Movimiento Directo.
                  </p>
                ) : (
                  <select
                    value={selectedCxpId}
                    onChange={(e) => setSelectedCxpId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    {cuentasPorPagar.map((cxp) => {
                      const pendiente = cxp.monto_total - cxp.monto_pagado;
                      return (
                        <option key={cxp.id} value={cxp.id}>
                          {cxp.folio} · {cxp.proveedor?.nombre || 'Proveedor'} — Pendiente: $
                          {pendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Total: $
                          {cxp.monto_total})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría de Flujo
                  </label>
                  <select
                    value={selectedCategoria}
                    onChange={(e) => setSelectedCategoria(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="Honorarios y Desarrollo">Honorarios y Desarrollo de Software</option>
                    <option value="Infraestructura Cloud">Infraestructura y Hosting Cloud</option>
                    <option value="Marketing y Ventas">Marketing y Publicidad</option>
                    <option value="Gastos Operativos">Gastos Operativos Generales</option>
                    <option value="Viáticos">Viáticos y Traslados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proyecto Asociado (opcional)
                  </label>
                  <select
                    value={selectedProyectoId}
                    onChange={(e) => setSelectedProyectoId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Ninguno / Movida General</option>
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConfirmConciliacion}
                disabled={isReconciling || (conciliarModo === 'CXP' && !selectedCxpId)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {isReconciling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Registrando en ERP...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Conciliación
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedComprobante(null)}
                disabled={isReconciling}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
