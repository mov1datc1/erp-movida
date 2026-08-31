'use client';

import React, { useState } from 'react';
import { Mail, BarChart2, Search, CheckCircle2, XCircle, Settings, FileText, Send, Loader2, AlertCircle } from 'lucide-react';
import { saveIntegracion, sendTestSMTPEmailAction } from '../actions';

export default function TabIntegraciones({ initialIntegraciones }: { initialIntegraciones: any[] }) {
  const [integraciones, setIntegraciones] = useState(initialIntegraciones);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Config State
  const emailIntegration = integraciones.find(i => i.proveedor === 'SMTP_CORREO');
  const initialConfig = emailIntegration?.config || {};
  const [host, setHost] = useState(initialConfig.host || 'mail.movidatci.com');
  const [port, setPort] = useState(initialConfig.port || '465');
  const [user, setUser] = useState(initialConfig.user || 'info@movidatci.com');
  const [pass, setPass] = useState(initialConfig.pass || 'DragonDorado2024-');
  const [recipients, setRecipients] = useState(initialConfig.recipients || initialConfig.destinatarios || 'info@movidatci.com');
  const [activa, setActiva] = useState(emailIntegration?.activa !== false);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTestResult(null);
    const config = { host, port, user, pass, recipients };
    const res = await saveIntegracion('SMTP_CORREO', config, activa);
    setIsLoading(false);

    if (res.success) {
      setIsEmailModalOpen(false);
      setIntegraciones(integraciones.filter(i => i.proveedor !== 'SMTP_CORREO').concat(res.data));
    } else {
      alert('Error al guardar: ' + res.error);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    setTestResult(null);
    // Ensure we save current config first so test uses current values
    const config = { host, port, user, pass, recipients };
    await saveIntegracion('SMTP_CORREO', config, activa);

    const res = await sendTestSMTPEmailAction(recipients);
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `¡Correo de prueba enviado con éxito a ${res.recipient}!`,
      });
    } else {
      setTestResult({
        success: false,
        message: `Error al conectar con el servidor SMTP: ${res.error}`,
      });
    }
  };

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
          
          {/* Correo Electrónico */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              {emailIntegration?.activa ? (
                <div className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Activa
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  <XCircle className="w-3 h-3" /> Inactiva
                </div>
              )}
            </div>
            
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Correo (SMTP)</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Conecta tu servidor de correo para envío de notificaciones y cotizaciones.
            </p>
            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" /> Configurar
            </button>
          </div>

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

      {/* Modal Email Config */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Configuración SMTP &amp; Notificaciones</h2>
              <p className="text-sm text-slate-500 mt-1">Configura las credenciales y la lista de destinatarios para alertas Kanban.</p>
            </div>

            <form onSubmit={handleSaveEmail} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {testResult && (
                <div
                  className={`p-4 rounded-2xl text-xs font-semibold border flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>{testResult.message}</div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-medium text-slate-800">Habilitar Integración</p>
                  <p className="text-xs text-slate-500">Permite el envío automático de correos desde el ERP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Servidor (Host)</label>
                  <input 
                    type="text" 
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm"
                    placeholder="mail.movidatci.com"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puerto</label>
                  <input 
                    type="text" 
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm"
                    placeholder="465"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email Remitente</label>
                <input 
                  type="email" 
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="info@movidatci.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña SMTP</label>
                <input 
                  type="password" 
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Lista de Destinatarios de Alertas Kanban
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Escribe uno o varios correos separados por coma a donde llegarán las notificaciones de movimientos de tarjetas:
                </p>
                <textarea 
                  rows={2}
                  value={recipients}
                  onChange={e => setRecipients(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-slate-800"
                  placeholder="info@movidatci.com, direccion@movidatci.com"
                  required
                />
              </div>

              <div className="pt-4 flex flex-wrap gap-3 justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTesting || isLoading}
                  className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200 flex items-center gap-1.5"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Probando SMTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-indigo-600" />
                      Probar Conexión SMTP
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isTesting}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
