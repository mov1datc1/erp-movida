'use client';

import React, { useState } from 'react';
import { Mail, Search, CheckCircle2, XCircle, Settings, FileText, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { saveIntegracion } from '../actions';

export default function TabIntegraciones({ initialIntegraciones }: { initialIntegraciones: any[] }) {
  const [integraciones, setIntegraciones] = useState(initialIntegraciones);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Facturapi Config State
  const facturapiIntegration = integraciones.find(i => i.proveedor === 'FACTURAPI');
  const facturapiConfig = facturapiIntegration?.config || {};
  const [isFacturapiModalOpen, setIsFacturapiModalOpen] = useState(false);
  const [facturapiLiveKey, setFacturapiLiveKey] = useState(facturapiConfig.live_key || '');
  const [facturapiTestKey, setFacturapiTestKey] = useState(facturapiConfig.test_key || '');
  const [facturapiActiva, setFacturapiActiva] = useState(facturapiIntegration?.activa || false);

  // WhatsApp Buzón Config State
  const whatsappIntegration = integraciones.find(i => i.proveedor === 'GASTOS_WHATSAPP_BUZON' || i.proveedor === 'WHATSAPP');
  const whatsappConfig = whatsappIntegration?.config?.webhookConfig || whatsappIntegration?.config || {};
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState(whatsappConfig.numeroTecnico || '+52 33 2164 8232');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState(whatsappConfig.verifyToken || 'movida_wh_token_2026');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(whatsappConfig.phoneNumberId || '');
  const [whatsappToken, setWhatsappToken] = useState(whatsappConfig.accessToken || '');
  const [whatsappActivo, setWhatsappActivo] = useState(whatsappIntegration?.activa !== false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveFacturapi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const config = { live_key: facturapiLiveKey, test_key: facturapiTestKey };
    const res = await saveIntegracion('FACTURAPI', config, facturapiActiva);
    setIsLoading(false);

    if (res.success) {
      setIsFacturapiModalOpen(false);
      setIntegraciones(integraciones.filter(i => i.proveedor !== 'FACTURAPI').concat(res.data));
    } else {
      alert('Error: ' + res.error);
    }
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const existingConfig = whatsappIntegration?.config || {};
    const newConfig = {
      ...existingConfig,
      webhookConfig: {
        ...(existingConfig.webhookConfig || {}),
        numeroTecnico: whatsappNumero,
        verifyToken: whatsappVerifyToken,
        phoneNumberId: whatsappPhoneNumberId,
        accessToken: whatsappToken,
        activo: whatsappActivo,
      }
    };
    const res = await saveIntegracion('GASTOS_WHATSAPP_BUZON', newConfig, whatsappActivo);
    setIsLoading(false);

    if (res.success) {
      setIsWhatsappModalOpen(false);
      setIntegraciones(integraciones.filter(i => i.proveedor !== 'GASTOS_WHATSAPP_BUZON').concat(res.data));
    } else {
      alert('Error: ' + res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Integraciones Disponibles</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Google Calendar / Meet */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> Inactiva
              </div>
            </div>
            <div className="w-12 h-12 bg-[#EA4335]/10 text-[#EA4335] rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6" /> {/* Google icon placeholder */}
            </div>
            <h3 className="text-lg font-bold text-slate-800">Google Meet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Genera enlaces de reuniones directamente desde el CRM (OAuth 2.0).
            </p>
            <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" /> Configurar API
            </button>
          </div>

          {/* Resend API */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> Inactiva
              </div>
            </div>
            <div className="w-12 h-12 bg-black/5 text-black rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Resend API</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Envío de correos ultra rápidos desde el CRM.
            </p>
            <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" /> Configurar API
            </button>
          </div>

          {/* Facturapi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4">
              {facturapiIntegration?.activa ? (
                <div className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Activa
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  <XCircle className="w-3 h-3" /> Inactiva
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Facturapi (CFDI)</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Automatiza la facturación electrónica CFDI 4.0 directamente desde el ERP.
            </p>
            <button 
              onClick={() => setIsFacturapiModalOpen(true)}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" /> Configurar API
            </button>
          </div>

          {/* WhatsApp Business Cloud API (Buzón Transversal & Gastos) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Línea Configurada
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">WhatsApp Buzón IA</h3>
            <p className="text-xs font-mono font-bold text-emerald-700 mt-1 mb-1">
              {whatsappNumero}
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Recepción y lectura de comprobantes de pago, gastos y mensajes de soporte vía Meta Cloud API.
            </p>
            <button 
              onClick={() => setIsWhatsappModalOpen(true)}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" /> Configurar WhatsApp
            </button>
          </div>

        </div>
      </div>

      {/* Facturapi Config Modal */}
      {isFacturapiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFacturapiModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Configuración Facturapi</h2>
              <p className="text-sm text-slate-500 mt-1">Ingresa tus llaves de API para habilitar el timbrado CFDI.</p>
            </div>
            
            <form onSubmit={handleSaveFacturapi} className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-medium text-slate-800">Habilitar Facturación</p>
                  <p className="text-xs text-slate-500">Permite emitir facturas en el CRM</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={facturapiActiva} onChange={(e) => setFacturapiActiva(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (Live)</label>
                <input
                  type="password"
                  required
                  value={facturapiLiveKey}
                  onChange={e => setFacturapiLiveKey(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="sk_live_..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (Test)</label>
                <input
                  type="password"
                  required
                  value={facturapiTestKey}
                  onChange={e => setFacturapiTestKey(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="sk_test_..."
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFacturapiModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors"
                >
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Buzón Config Modal */}
      {isWhatsappModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsWhatsappModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Configuración WhatsApp Buzón IA</h2>
                  <p className="text-xs text-slate-500">Meta WhatsApp Business Cloud API & Webhooks</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSaveWhatsapp} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Habilitar Buzón WhatsApp</p>
                  <p className="text-xs text-emerald-700">Recibe y procesa comprobantes financieros y mensajes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappActivo} onChange={(e) => setWhatsappActivo(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número Técnico Oficial de WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={whatsappNumero}
                    onChange={e => setWhatsappNumero(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    placeholder="+52 33 2164 8232"
                  />
                  <a
                    href={`https://wa.me/${whatsappNumero.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
                    title="Abrir chat en WhatsApp"
                  >
                    <ExternalLink className="w-4 h-4" /> Probar Chat
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Línea dedicada para el buzón transversal de Movida ERP.
                </p>
              </div>

              {/* Parámetros para Meta Developer Portal */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Datos para configurar en Meta for Developers
                </p>
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">URL de Callback (Webhook)</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 select-all">
                    <span className="truncate">https://erp-movida.vercel.app/api/webhooks/whatsapp</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('https://erp-movida.vercel.app/api/webhooks/whatsapp', 'wh-url')}
                      className="ml-2 text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      {copiedKey === 'wh-url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">Token de Verificación</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 select-all">
                    <span>{whatsappVerifyToken}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(whatsappVerifyToken, 'wh-token')}
                      className="ml-2 text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      {copiedKey === 'wh-token' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number ID (Meta Graph API)
                </label>
                <input
                  type="text"
                  value={whatsappPhoneNumberId}
                  onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej. 106548729182746"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permanent Access Token (opcional para descarga multimedia)
                </label>
                <input
                  type="password"
                  value={whatsappToken}
                  onChange={e => setWhatsappToken(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="EAAB..."
                />
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWhatsappModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
