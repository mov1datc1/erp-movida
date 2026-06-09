'use client';

import React, { useState, useEffect } from 'react';
import { TareaStatus, Prioridad, CategoriaTarea } from '@prisma/client';
import { updateTarea } from '@/app/actions/tareas';
import { MoreHorizontal, Plus, Clock, MessageSquare, Flame } from 'lucide-react';
import NuevaTareaModal from '../../tareas/NuevaTareaModal';
import EditarTareaModal from '../../tareas/EditarTareaModal';

interface Proyecto {
  id: string;
  nombre: string;
  cliente: { id: string; nombre: string } | null;
}

interface Encargado {
  id: string;
  nombre: string;
}

interface Comentario {
  id: string;
  texto: string;
  createdAt: Date;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: Date | null;
  estatus: TareaStatus;
  prioridad: Prioridad;
  categoria: CategoriaTarea;
  orden: number;
  is_focus: boolean;
  encargados: Encargado[];
  comentarios: Comentario[];
  createdAt: Date;
}

interface Props {
  proyecto: Proyecto;
  initialTareas: Tarea[];
  encargados: Encargado[];
}

const COLUMNS: { id: TareaStatus; title: string; bg: string }[] = [
  { id: 'PENDIENTE', title: "Pendiente", bg: "bg-slate-100" },
  { id: 'EN_CURSO', title: "En Curso", bg: "bg-blue-50" },
  { id: 'ON_HOLD', title: "On Hold", bg: "bg-purple-50" },
  { id: 'COMPLETADA', title: "Completada", bg: "bg-green-50" },
];

const priorityColors: Record<Prioridad, string> = {
  URGENTE: "text-red-600 bg-red-100",
  ALTA: "text-orange-600 bg-orange-100",
  MEDIA: "text-amber-600 bg-amber-100",
  BAJA: "text-green-600 bg-green-100"
};

export default function ProyectoKanbanBoard({ proyecto, initialTareas, encargados }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTareas(initialTareas);
  }, [initialTareas]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Trick for drag image styling
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, status: TareaStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Actualización optimista
    setTareas(prev => prev.map(t => t.id === draggedTaskId ? { ...t, estatus: status } : t));

    // Guardar en backend
    await updateTarea(draggedTaskId, { estatus: status });
    setDraggedTaskId(null);
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
      {COLUMNS.map((col) => {
        const columnTasks = tareas.filter(t => t.estatus === col.id).sort((a, b) => a.orden - b.orden);

        return (
          <div
            key={col.id}
            className="w-80 shrink-0 flex flex-col max-h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={`px-4 py-3 rounded-t-xl font-bold text-sm text-slate-800 flex justify-between items-center border border-b-0 border-slate-200 ${col.bg}`}>
              {col.title}
              <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 shadow-sm font-semibold">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-b-xl p-3 space-y-3 overflow-y-auto">
              {columnTasks.map(tarea => (
                <div
                  key={tarea.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tarea.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white p-4 rounded-xl border ${tarea.is_focus ? 'border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]' : 'border-slate-100'} shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all group relative`}
                >
                  {tarea.is_focus && (
                    <div className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full border border-red-200 shadow-sm z-10">
                      <Flame className="w-3.5 h-3.5" fill="currentColor" />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${priorityColors[tarea.prioridad]}`}>
                      {tarea.prioridad}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditarTareaModal
                        tareaToEdit={tarea}
                        clientes={proyecto.cliente ? [proyecto.cliente] : []}
                        encargados={encargados}
                        proyecto_id={proyecto.id}
                      />
                    </div>
                  </div>

                  <h4 className={`font-bold text-sm leading-tight mb-2 ${tarea.estatus === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {tarea.titulo}
                  </h4>

                  {tarea.encargados.length > 0 && (
                    <div className="flex -space-x-2 mb-3">
                      {tarea.encargados.map(enc => (
                        <div key={enc.id} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={enc.nombre}>
                          {enc.nombre.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5" title="Fecha límite">
                      <Clock className={`w-3.5 h-3.5 ${tarea.fecha_limite && new Date(tarea.fecha_limite).getTime() < new Date().getTime() && tarea.estatus !== 'COMPLETADA' ? 'text-red-500' : ''}`} />
                      <span className={tarea.fecha_limite && new Date(tarea.fecha_limite).getTime() < new Date().getTime() && tarea.estatus !== 'COMPLETADA' ? 'text-red-500 font-bold' : ''}>
                        {tarea.fecha_limite ? formatDateShort(tarea.fecha_limite) : '-'}
                      </span>
                    </div>

                    {tarea.comentarios.length > 0 && (
                      <div className="flex items-center gap-1 text-slate-400" title={`${tarea.comentarios.length} comentarios`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{tarea.comentarios.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <NuevaTareaModal
                  clientes={proyecto.cliente ? [proyecto.cliente] : []}
                  encargados={encargados}
                  variant="ghost"
                  proyecto_id={proyecto.id}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
