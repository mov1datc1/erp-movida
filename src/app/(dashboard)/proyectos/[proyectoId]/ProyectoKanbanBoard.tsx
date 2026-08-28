'use client';

import React, { useState, useEffect } from 'react';
import { TareaStatus, Prioridad, CategoriaTarea, SprintEstatus } from '@prisma/client';
import { updateTarea } from '@/app/actions/tareas';
import { MoreHorizontal, Plus, Clock, MessageSquare, Flame, Layers, Sparkles, UserCheck } from 'lucide-react';
import NuevaTareaModal from '../../tareas/NuevaTareaModal';
import EditarTareaModal from '../../tareas/EditarTareaModal';
import WeeklySprintNavigator from './WeeklySprintNavigator';
import POExecutiveDigest from './POExecutiveDigest';
import { useRouter } from 'next/navigation';

interface Encargado {
  id: string;
  nombre: string;
}

interface Comentario {
  id: string;
  texto: string;
  createdAt: Date;
}

interface Sprint {
  id: string;
  numero: number;
  nombre: string;
  objetivo: string | null;
  fecha_inicio: string | Date | null;
  fecha_fin: string | Date | null;
  horas_estimadas: number;
  horas_reales: number;
  estatus: SprintEstatus;
  checkpoint_completado: boolean;
  notas_checkpoint: string | null;
  bloqueos: string | null;
  tareas: any[];
}

interface Proyecto {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  horas_dia: number | null;
  dias_semana: number | null;
  cliente: { id: string; nombre: string } | null;
  sprints: Sprint[];
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
  sprint_id?: string | null;
  horas_estimadas?: number | null;
  horas_reales?: number | null;
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
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'PO_DIGEST'>('KANBAN');

  useEffect(() => {
    setTareas(initialTareas);
  }, [initialTareas]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
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

    setTareas(prev => prev.map(t => t.id === draggedTaskId ? { ...t, estatus: status } : t));

    await updateTarea(draggedTaskId, { estatus: status });
    setDraggedTaskId(null);
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  // Filter tasks based on selected Sprint Tab
  const filteredTareas = selectedSprintId === 'ALL'
    ? tareas
    : tareas.filter(t => t.sprint_id === selectedSprintId);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Weekly Sprint Navigator Bar */}
      <WeeklySprintNavigator
        proyecto={proyecto}
        selectedSprintId={selectedSprintId}
        onSelectSprint={setSelectedSprintId}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onRefresh={handleRefresh}
      />

      {/* View Switcher: PO Digest vs Kanban */}
      {viewMode === 'PO_DIGEST' ? (
        <div className="flex-1 overflow-y-auto">
          <POExecutiveDigest proyecto={proyecto} onRefresh={handleRefresh} />
        </div>
      ) : (
        <div className="flex-1 flex h-full gap-6 overflow-x-auto pb-4 items-start">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTareas
              .filter(t => t.estatus === col.id)
              .sort((a, b) => a.orden - b.orden);

            return (
              <div
                key={col.id}
                className="w-80 shrink-0 flex flex-col max-h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={`px-4 py-3 rounded-t-2xl font-bold text-sm text-slate-800 flex justify-between items-center border border-b-0 border-slate-200 ${col.bg}`}>
                  <span>{col.title}</span>
                  <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 shadow-sm font-semibold">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-b-2xl p-3 space-y-3 overflow-y-auto">
                  {columnTasks.map(tarea => {
                    const parentSprint = proyecto.sprints.find(s => s.id === tarea.sprint_id);

                    return (
                      <div
                        key={tarea.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tarea.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white p-4 rounded-2xl border ${
                          tarea.is_focus ? 'border-red-400 shadow-[0_0_12px_rgba(248,113,113,0.3)]' : 'border-slate-100'
                        } shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group relative`}
                      >
                        {tarea.is_focus && (
                          <div className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full border border-red-200 shadow-sm z-10">
                            <Flame className="w-3.5 h-3.5" fill="currentColor" />
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-2 gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${priorityColors[tarea.prioridad]}`}>
                              {tarea.prioridad}
                            </span>

                            {parentSprint && (
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                S{parentSprint.numero}
                              </span>
                            )}
                          </div>

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

                        {tarea.descripcion && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                            {tarea.descripcion}
                          </p>
                        )}

                        {tarea.encargados.length > 0 && (
                          <div className="flex -space-x-2 mb-3">
                            {tarea.encargados.map(enc => (
                              <div
                                key={enc.id}
                                className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                                title={enc.nombre}
                              >
                                {enc.nombre.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1" title="Fecha límite">
                              <Clock className={`w-3.5 h-3.5 ${tarea.fecha_limite && new Date(tarea.fecha_limite).getTime() < new Date().getTime() && tarea.estatus !== 'COMPLETADA' ? 'text-red-500' : ''}`} />
                              <span className={tarea.fecha_limite && new Date(tarea.fecha_limite).getTime() < new Date().getTime() && tarea.estatus !== 'COMPLETADA' ? 'text-red-500 font-bold' : ''}>
                                {tarea.fecha_limite ? formatDateShort(tarea.fecha_limite) : '-'}
                              </span>
                            </div>

                            {tarea.horas_estimadas ? (
                              <span className="text-[10px] font-mono bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-600">
                                {tarea.horas_estimadas}h
                              </span>
                            ) : null}
                          </div>

                          {tarea.comentarios.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-400" title={`${tarea.comentarios.length} comentarios`}>
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{tarea.comentarios.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

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
      )}
    </div>
  );
}
