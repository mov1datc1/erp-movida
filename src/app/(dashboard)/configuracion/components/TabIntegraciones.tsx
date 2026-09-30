'use client';

import React, { useState } from 'react';
import { Mail, Search, CheckCircle2, XCircle, Settings, FileText } from 'lucide-react';
import { saveIntegracion } from '../actions';

export default function TabIntegraciones({ initialIntegraciones }: { initialIntegraciones: any[] }) {
  const [integraciones, setIntegraciones] = useState(initialIntegraciones);
  const [isLoading, setIsLoading] = useState(false);

  // Facturapi Config State
  const facturapiIntegration = integraciones.find(i => i.proveedor === 'FACTURAPI');
  const facturapiConfig = facturapiIntegration?.config || {};
  const [isFacturapiModalOpen, setIsFacturapiModalOpen] = useState(false);
  const [facturapiLiveKey, setFacturapiLiveKey] = useState(facturapiConfig.live_key || '');
  const [facturapiTestKey, setFacturapiTestKey] = useState(facturapiConfig.test_key || '');
  const [facturapiActiva, setFacturapiActiva] = useState(facturapiIntegration?.activa || false);

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

    </div>
  );
}
