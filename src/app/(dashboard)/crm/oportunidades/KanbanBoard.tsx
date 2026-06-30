'use client';

import React, { useState } from 'react';
import { GripVertical, X, Briefcase, DollarSign, User, Loader2, Trash2 } from 'lucide-react';
import { updateOportunidadEtapa, updateOportunidad, deleteOportunidad } from '@/app/actions/crm';

interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
}

interface Oportunidad {
  id: string;
  titulo: string;
  valor_estimado: number;
  etapa: string;
  cliente: Cliente | null;
}

interface KanbanBoardProps {
  initialOportunidades: Oportunidad[];
  clientes: {id: string, nombre: string, empresa: string | null}[];
}

export default function KanbanBoard({ initialOportunidades, clientes }: KanbanBoardProps) {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>(initialOportunidades);
  const [isDragging, setIsDragging] = useState(false);
  
  const [editingOportunidad, setEditingOportunidad] = useState<Oportunidad | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setOportunidades(initialOportunidades);
  }, [initialOportunidades]);

  const etapas = [
    { id: "PROSPECTO", name: "Prospecto", color: "bg-slate-200 text-slate-700" },
    { id: "CONTACTADO", name: "Contactado", color: "bg-blue-100 text-blue-700" },
    { id: "NEGOCIACION", name: "Negociación", color: "bg-orange-100 text-orange-700" },
    { id: "GANADO", name: "Ganado", color: "bg-success/20 text-success" },
  ];

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, oportunidadId: string) => {
    e.dataTransfer.setData('oportunidadId', oportunidadId);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, etapaId: string) => {
    e.preventDefault();
    setIsDragging(false);
    
    const oportunidadId = e.dataTransfer.getData('oportunidadId');
    if (!oportunidadId) return;

    // Find the dropped opportunity
    const draggedOportunidad = oportunidades.find(o => o.id === oportunidadId);
    if (!draggedOportunidad || draggedOportunidad.etapa === etapaId) return;

    // Optimistically update the UI
    setOportunidades(prev => prev.map(o => 
      o.id === oportunidadId ? { ...o, etapa: etapaId } : o
    ));

    const result = await updateOportunidadEtapa(oportunidadId, etapaId);
    if (!result.success) {
      // Revert if error
      alert(result.error || 'No se pudo mover la oportunidad');
      setOportunidades(initialOportunidades);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOportunidad) return;
    
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await updateOportunidad(editingOportunidad.id, formData);
    
    if (result.success) {
      setEditingOportunidad(null);
    } else {
      setError(result.error || 'Error desconocido');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta oportunidad?')) return;
    setIsSubmitting(true);
    const result = await deleteOportunidad(id);
    if (result.success) {
      setEditingOportunidad(null);
    } else {
      alert(result.error || 'Error al eliminar');
    }
    setIsSubmitting(false);
  };

  return (
    <>
    <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
      {etapas.map(etapa => {
        const leads = oportunidades.filter(o => o.etapa === etapa.id);
        const totalValor = leads.reduce((acc, curr) => acc + curr.valor_estimado, 0);

        return (
          <div 
            key={etapa.id} 
            className="w-80 flex-shrink-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, etapa.id)}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${etapa.color}`}>
                  {etapa.name}
                </span>
                <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {leads.length}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-600">
                ${totalValor.toLocaleString()}
              </div>
            </div>

            <div className={`flex-1 p-3 space-y-3 overflow-y-auto min-h-[150px] transition-colors ${isDragging ? 'bg-slate-100/50' : ''}`}>
              {leads.map(lead => (
                <div 
                  key={lead.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setEditingOportunidad(lead)}
                  className="bg-white p-4 rounded-xl border border-slate-200 card-shadow hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing group relative z-10"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-text-main text-sm">{lead.titulo}</h4>
                    <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-text-muted mb-3">{lead.cliente?.nombre} ({lead.cliente?.empresa || 'Sin empresa'})</p>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-success">${lead.valor_estimado.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              
              {leads.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl h-24 flex items-center justify-center text-slate-400 text-sm pointer-events-none">
                  Soltar aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Edit Modal */}
    {editingOportunidad && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Editar Oportunidad
            </h2>
            <button 
              onClick={() => setEditingOportunidad(null)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título de Oportunidad *</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    name="titulo" 
                    required 
                    defaultValue={editingOportunidad.titulo}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado (MXN) *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="number" 
                    name="valor_estimado" 
                    required
                    min="0"
                    step="0.01"
                    defaultValue={editingOportunidad.valor_estimado}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente Asociado *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select 
                    name="cliente_id" 
                    required
                    defaultValue={editingOportunidad.cliente?.id || ''}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                  >
                    <option value="" disabled>Selecciona un cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => handleDelete(editingOportunidad.id)}
                disabled={isSubmitting}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingOportunidad(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
