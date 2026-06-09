'use client';

import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { updateOportunidadEtapa } from '@/app/actions/crm';

interface Cliente {
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
}

export default function KanbanBoard({ initialOportunidades }: KanbanBoardProps) {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>(initialOportunidades);
  const [isDragging, setIsDragging] = useState(false);

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

    // Update in database
    const result = await updateOportunidadEtapa(oportunidadId, etapaId);
    if (!result.success) {
      // Revert if error
      alert(result.error || 'No se pudo mover la oportunidad');
      setOportunidades(initialOportunidades);
    }
  };

  return (
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
  );
}
