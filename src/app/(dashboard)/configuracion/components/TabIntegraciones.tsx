'use client';

import React, { useState } from 'react';
import { Mail, BarChart2, Search, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { saveIntegracion } from '../actions';

export default function TabIntegraciones({ initialIntegraciones }: { initialIntegraciones: any[] }) {
  const [integraciones, setIntegraciones] = useState(initialIntegraciones);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email Config State
  const emailIntegration = integraciones.find(i => i.proveedor === 'SMTP_CORREO');
  const initialConfig = emailIntegration?.config || {};
  const [host, setHost] = useState(initialConfig.host || '');
  const [port, setPort] = useState(initialConfig.port || '');
  const [user, setUser] = useState(initialConfig.user || '');
  const [pass, setPass] = useState(initialConfig.pass || '');
  const [activa, setActiva] = useState(emailIntegration?.activa || false);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const config = { host, port, user, pass };
    const res = await saveIntegracion('SMTP_CORREO', config, activa);
    setIsLoading(false);

    if (res.success) {
      setIsEmailModalOpen(false);
      setIntegraciones(integraciones.filter(i => i.proveedor !== 'SMTP_CORREO').concat(res.data));
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

          {/* Facebook Ads */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden opacity-75">
            <div className="absolute top-0 right-0 p-4">
              <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-wider">
                Fase 2
              </div>
            </div>
            <div className="w-12 h-12 bg-[#1877F2]/10 text-[#1877F2] rounded-xl flex items-center justify-center mb-4">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Facebook Ads</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Sincroniza tus leads directamente desde las campañas de Meta.
            </p>
            <button disabled className="w-full py-2.5 bg-slate-50 text-slate-400 font-medium text-sm rounded-xl border border-slate-100 cursor-not-allowed">
              Próximamente
            </button>
          </div>

          {/* Google Ads */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden opacity-75">
            <div className="absolute top-0 right-0 p-4">
              <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-wider">
                Fase 2
              </div>
            </div>
            <div className="w-12 h-12 bg-[#EA4335]/10 text-[#EA4335] rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Google Ads</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 h-10">
              Importa conversiones y prospectos desde tus anuncios de Google.
            </p>
            <button disabled className="w-full py-2.5 bg-slate-50 text-slate-400 font-medium text-sm rounded-xl border border-slate-100 cursor-not-allowed">
              Próximamente
            </button>
          </div>

        </div>
      </div>

      {/* Modal Email Config */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Configuración SMTP</h2>
              <p className="text-sm text-slate-500 mt-1">Ingresa las credenciales de tu proveedor de correo.</p>
            </div>

            <form onSubmit={handleSaveEmail} className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-medium text-slate-800">Habilitar Integración</p>
                  <p className="text-xs text-slate-500">Permite el envío de correos desde el ERP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Servidor (Host)</label>
                  <input 
                    type="text" 
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puerto</label>
                  <input 
                    type="text" 
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="587"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email</label>
                <input 
                  type="email" 
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="hola@empresa.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña (App Password)</label>
                <input 
                  type="password" 
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
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
