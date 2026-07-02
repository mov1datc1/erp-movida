'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, Mail, Phone, Building2, MapPin, 
  Calendar, CheckCircle2, Clock, Edit2, Plus,
  FileText, PhoneCall, Users, Bot, Sparkles, MessageSquare, MoreHorizontal
} from 'lucide-react';
import { crearActividadCRM } from '@/app/actions/crm';

export default function ClienteDetailClient({ cliente }: { cliente: any }) {
  const [activeTab, setActiveTab] = useState('Actividades');
  const [subTab, setSubTab] = useState('Todas');
  
  const [isLoading, setIsLoading] = useState(false);
  const [actividadForm, setActividadForm] = useState({
    titulo: '',
    descripcion: ''
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getFuenteBadge = (fuente: string | null) => {
    const f = (fuente || 'Manual').toLowerCase();
    if (f.includes('meta') || f.includes('facebook') || f.includes('instagram')) {
      return { label: fuente || 'Meta Ads', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    }
    if (f.includes('google')) {
      return { label: fuente || 'Google Ads', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    }
    if (f.includes('wordpress') || f.includes('web')) {
      return { label: fuente || 'WordPress', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
    }
    return { label: fuente || 'Manual', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const badge = getFuenteBadge(cliente.fuente);

  const handleSubmitActividad = async (tipo: 'NOTA' | 'CORREO' | 'LLAMADA' | 'REUNION') => {
    if (!actividadForm.descripcion.trim()) return;
    
    setIsLoading(true);
    await crearActividadCRM(
      cliente.id,
      tipo,
      actividadForm.titulo || `Nueva ${tipo.toLowerCase()}`,
      actividadForm.descripcion
    );
    
    setActividadForm({ titulo: '', descripcion: '' });
    setIsLoading(false);
  };

  // Filtrar actividades para el feed
  const filteredActivities = cliente.actividades_crm.filter((act: any) => {
    if (subTab === 'Todas') return true;
    if (subTab === 'Notas') return act.tipo === 'NOTA';
    if (subTab === 'Correos') return act.tipo === 'CORREO';
    if (subTab === 'Llamadas') return act.tipo === 'LLAMADA';
    if (subTab === 'Reuniones') return act.tipo === 'REUNION';
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-6 bg-slate-50 overflow-hidden">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/crm/clientes" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{cliente.nombre}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              cliente.estatus === 'ACTIVO' ? 'bg-success/10 text-success' :
              cliente.estatus === 'LEAD' ? 'bg-blue-500/10 text-blue-600' :
              'bg-slate-100 text-slate-500'
            }`}>
              {cliente.estatus}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Acciones
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: About Contact */}
        <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 text-primary rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-sm border border-primary/10">
                {getInitials(cliente.nombre)}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{cliente.nombre}</h2>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {cliente.empresa || 'Sin empresa asociada'}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex justify-center gap-2 mb-8">
              <button 
                onClick={() => {setActiveTab('Actividades'); setSubTab('Notas');}}
                className="w-12 h-12 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-medium">Nota</span>
              </button>
              <button 
                onClick={() => {setActiveTab('Actividades'); setSubTab('Correos');}}
                className="w-12 h-12 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <Mail className="w-5 h-5" />
                <span className="text-[10px] font-medium">Correo</span>
              </button>
              <button 
                onClick={() => {setActiveTab('Actividades'); setSubTab('Llamadas');}}
                className="w-12 h-12 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <PhoneCall className="w-5 h-5" />
                <span className="text-[10px] font-medium">Llamar</span>
              </button>
              <button 
                onClick={() => {setActiveTab('Actividades'); setSubTab('Reuniones');}}
                className="w-12 h-12 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[10px] font-medium">Reunión</span>
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between group">
                <h3 className="text-sm font-bold text-slate-900">Acerca de este contacto</h3>
                <button className="text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Editar</button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium">Correo electrónico</p>
                  <a href={`mailto:${cliente.email}`} className="text-primary hover:underline flex items-center gap-2 font-medium break-all">
                    {cliente.email || '—'}
                  </a>
                </div>
                
                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium">Número de teléfono</p>
                  <p className="text-slate-900">{cliente.telefono || '—'}</p>
                </div>
                
                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium">RFC / Tax ID</p>
                  <p className="text-slate-900 font-mono text-xs">{cliente.rfc_taxid || '—'}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-slate-500 text-xs mb-1 font-medium">Dirección Fiscal</p>
                  <p className="text-slate-900 text-sm">{cliente.razon_social || cliente.empresa || cliente.nombre}</p>
                  <p className="text-slate-600 text-xs mt-1">
                    {cliente.direccion ? `${cliente.direccion}, ` : ''}
                    {cliente.colonia ? `${cliente.colonia}, ` : ''}
                    {cliente.ciudad ? `${cliente.ciudad}, ` : ''}
                    {cliente.codigo_postal ? `C.P. ${cliente.codigo_postal}` : ''}
                    {!cliente.direccion && !cliente.colonia && !cliente.ciudad && !cliente.codigo_postal && 'Sin dirección registrada'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-slate-500 text-xs mb-2 font-medium">Fuente del registro</p>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium">Fecha de creación</p>
                  <p className="text-slate-900">{new Date(cliente.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Activity Feed */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          
          {/* Tabs Navigation */}
          <div className="flex px-6 pt-4 border-b border-slate-200">
            {['Descripción', 'Actividades', 'Información Avanzada'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
            {activeTab === 'Actividades' ? (
              <div className="max-w-3xl mx-auto">
                
                {/* Activity Composer */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
                  <div className="flex border-b border-slate-100 px-2 pt-2">
                    {['Notas', 'Correos', 'Llamadas', 'Reuniones'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSubTab(tab)}
                        className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${
                          subTab === tab 
                            ? 'bg-slate-50 text-primary border border-slate-200 border-b-white -mb-px' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        {tab === 'Notas' && <FileText className="w-3.5 h-3.5" />}
                        {tab === 'Correos' && <Mail className="w-3.5 h-3.5" />}
                        {tab === 'Llamadas' && <PhoneCall className="w-3.5 h-3.5" />}
                        {tab === 'Reuniones' && <Calendar className="w-3.5 h-3.5" />}
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50">
                    <textarea 
                      placeholder={
                        subTab === 'Notas' ? 'Escribe una nota interna (no visible para el cliente)...' :
                        subTab === 'Correos' ? 'Redacta un correo (Próximamente conexión SMTP/Resend)...' :
                        subTab === 'Llamadas' ? 'Registra los detalles de la llamada...' :
                        'Añade detalles de la reunión (Próximamente Google Meet)...'
                      }
                      className="w-full min-h-[100px] p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      value={actividadForm.descripcion}
                      onChange={(e) => setActividadForm({...actividadForm, descripcion: e.target.value})}
                    />
                    
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        {/* Fake attachment buttons for UI completeness */}
                        <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        disabled={isLoading || !actividadForm.descripcion.trim()}
                        onClick={() => handleSubmitActividad(
                          subTab === 'Notas' ? 'NOTA' : 
                          subTab === 'Correos' ? 'CORREO' : 
                          subTab === 'Llamadas' ? 'LLAMADA' : 'REUNION'
                        )}
                        className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                      >
                        {isLoading && <Clock className="w-4 h-4 animate-spin" />}
                        Guardar {subTab.slice(0, -1)}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SubTab Filters */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSubTab('Todas')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${subTab === 'Todas' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      Todas las actividades
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{filteredActivities.length} registros</span>
                </div>

                {/* Timeline Feed */}
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 pb-12">
                  
                  {filteredActivities.length === 0 && (
                    <div className="text-center py-12 -ml-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">No hay actividades para mostrar</p>
                      <p className="text-slate-400 text-xs mt-1">Crea una nota o registra un correo para empezar.</p>
                    </div>
                  )}

                  {filteredActivities.map((act: any) => (
                    <div key={act.id} className="relative">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[35px] w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm ${
                        act.tipo === 'NOTA' ? 'bg-amber-400' :
                        act.tipo === 'CORREO' ? 'bg-blue-500' :
                        act.tipo === 'LLAMADA' ? 'bg-emerald-500' :
                        act.tipo === 'REUNION' ? 'bg-purple-500' :
                        'bg-slate-400'
                      }`}>
                        {act.tipo === 'NOTA' && <FileText className="w-3.5 h-3.5" />}
                        {act.tipo === 'CORREO' && <Mail className="w-3.5 h-3.5" />}
                        {act.tipo === 'LLAMADA' && <PhoneCall className="w-3.5 h-3.5" />}
                        {act.tipo === 'REUNION' && <Calendar className="w-3.5 h-3.5" />}
                        {act.tipo === 'SISTEMA' && <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm group hover:border-slate-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {act.tipo === 'NOTA' ? 'Nota Interna' : 
                               act.tipo === 'CORREO' ? 'Correo Registrado' : 
                               act.tipo === 'LLAMADA' ? 'Registro de Llamada' :
                               act.tipo === 'REUNION' ? 'Reunión' : 'Sistema'}
                              {act.usuario && <span className="text-xs font-normal text-slate-500">• {act.usuario.nombre}</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                            <span>{new Date(act.fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            <button className="opacity-0 group-hover:opacity-100 hover:bg-slate-100 p-1 rounded transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {act.titulo && <p className="text-sm font-semibold text-slate-800 mb-1">{act.titulo}</p>}
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{act.descripcion}</p>
                      </div>
                    </div>
                  ))}

                  {/* Creation event at the bottom */}
                  <div className="relative">
                    <div className="absolute -left-[35px] w-8 h-8 bg-slate-200 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="bg-transparent p-2">
                      <p className="text-sm font-medium text-slate-500">
                        Este cliente fue creado en el sistema.
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(cliente.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <p className="font-medium text-slate-500 mb-2">Contenido de {activeTab}</p>
                <p className="text-sm">En construcción o no disponible para este contacto.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI & Deals */}
        <div className="w-[320px] bg-slate-50 border-l border-slate-200 overflow-y-auto p-4 space-y-4">
          
          {/* Asistente AI Card */}
          <div className="bg-white rounded-xl border border-primary/20 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-primary/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Asistente AI
              </h3>
            </div>
            <div className="p-4">
              {filteredActivities.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Resumen generado automáticamente: Este cliente tiene <span className="font-semibold">{filteredActivities.length} interacciones</span> recientes. 
                    {cliente.estatus === 'LEAD' ? ' Parece estar en fase temprana de exploración.' : ''}
                  </p>
                  <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                    <Bot className="w-4 h-4" /> Generar nuevo resumen
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">
                  No hay suficientes datos para generar un resumen. Interactúa con el cliente para alimentar a la IA.
                </p>
              )}
            </div>
          </div>

          {/* Oportunidades Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Negocios ({cliente.oportunidades?.length || 0})</h3>
              <button className="text-primary hover:bg-primary/10 p-1 rounded transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-0">
              {cliente.oportunidades?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {cliente.oportunidades.map((op: any) => (
                    <div key={op.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-bold text-primary mb-1">{op.titulo}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-600">${op.valor_estimado.toLocaleString()}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">{op.etapa}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6 px-4">
                  Haz seguimiento de las oportunidades de ingresos asociadas con este registro.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
