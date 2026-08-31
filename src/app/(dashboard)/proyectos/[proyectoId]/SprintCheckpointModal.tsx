'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  Zap,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { updateSprintCheckpoint } from '@/app/actions/sprints';
import { updateTarea } from '@/app/actions/tareas';
import { SprintEstatus, TareaStatus } from '@prisma/client';

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estatus: TareaStatus;
  horas_estimadas: number | null;
  horas_reales: number | null;
  encargados: Array<{ id: string; nombre: string }>;
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
  tareas: Tarea[];
}

interface Props {
  sprint: Sprint;
  onUpdate?: () => void;
  triggerButton?: React.ReactNode;
}

export default function SprintCheckpointModal({ sprint, onUpdate, triggerButton }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [notas, setNotas] = useState(sprint.notas_checkpoint || '');
  const [bloqueos, setBloqueos] = useState(sprint.bloqueos || '');
  const [horasReales, setHorasReales] = useState(sprint.horas_reales || 0);
  const [estatus, setEstatus] = useState<SprintEstatus>(sprint.estatus);
  const [checkpointCompletado, setCheckpointCompletado] = useState(sprint.checkpoint_completado);
  const [tareasList, setTareasList] = useState<Tarea[]>(sprint.tareas || []);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleTaskEstatus = async (tareaId: string, currentStatus: TareaStatus) => {
    const newStatus: TareaStatus = currentStatus === 'COMPLETADA' ? 'EN_CURSO' : 'COMPLETADA';
    setTareasList(prev =>
      prev.map(t => (t.id === tareaId ? { ...t, estatus: newStatus } : t))
    );
    await updateTarea(tareaId, { estatus: newStatus });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);

    const res = await updateSprintCheckpoint({
      sprintId: sprint.id,
      checkpoint_completado: checkpointCompletado,
      notas_checkpoint: notas,
      bloqueos: bloqueos,
      horas_reales: Number(horasReales),
      estatus: estatus,
    });

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Checkpoint semanal guardado exitosamente');
      setTimeout(() => {
        setIsOpen(false);
        if (onUpdate) onUpdate();
      }, 1200);
    }
  };

  const totalTareas = tareasList.length;
  const completadas = tareasList.filter(t => t.estatus === 'COMPLETADA').length;
  const porcentaje = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

  const modalJSX = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-emerald-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] relative z-[10000]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-100 text-slate-900 shrink-0 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Sprint Checkpoint #{sprint.numero}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  sprint.estatus === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {sprint.estatus}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {sprint.nombre}
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                {sprint.objetivo || 'Avance semanal del equipo de desarrollo.'}
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress metric bar */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Entregables</span>
              <p className="text-lg font-bold text-emerald-600 font-mono">
                {completadas} / {totalTareas} ({porcentaje}%)
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Capacidad Est.</span>
              <p className="text-lg font-bold text-slate-800 font-mono">
                {sprint.horas_estimadas} hrs
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Horas Reales</span>
              <p className="text-lg font-bold text-sky-600 font-mono">
                {horasReales} hrs
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-medium border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Task Checklist */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              Revisión de Entregables del Sprint
            </h3>

            <div className="space-y-2.5">
              {tareasList.map(tarea => {
                const isDone = tarea.estatus === 'COMPLETADA';
                return (
                  <div
                    key={tarea.id}
                    onClick={() => toggleTaskEstatus(tarea.id, tarea.estatus)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isDone
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-700'
                        : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        className="w-5 h-5 accent-emerald-600 rounded-lg cursor-pointer"
                      />
                      <div>
                        <p className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {tarea.titulo}
                        </p>
                        {tarea.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {tarea.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {tarea.horas_estimadas ? (
                        <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                          {tarea.horas_estimadas} hrs
                        </span>
                      ) : null}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-700'
                            : tarea.estatus === 'EN_CURSO'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tarea.estatus}
                      </span>
                    </div>
                  </div>
                );
              })}

              {tareasList.length === 0 && (
                <p className="text-xs text-slate-500 italic">No hay tareas específicas asignadas a este sprint.</p>
              )}
            </div>
          </div>

          {/* Dev Feedback Form */}
          <form id="checkpoint-form" onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Horas Reales Invertidas
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={horasReales}
                    onChange={e => setHorasReales(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estatus del Sprint
                </label>
                <select
                  value={estatus}
                  onChange={e => setEstatus(e.target.value as SprintEstatus)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="PLANIFICADO">Planificado</option>
                  <option value="EN_CURSO">En Curso</option>
                  <option value="REVISION">En Revisión</option>
                  <option value="COMPLETADO">Completado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Notas de Logros & Checkpoint Semanal
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                placeholder="Ej. Se completó el esquema Supabase y la integración de Zoom OAuth Server-to-Server..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Bloqueos o Riesgos Identificados (Opcional)
              </label>
              <textarea
                value={bloqueos}
                onChange={e => setBloqueos(e.target.value)}
                rows={2}
                placeholder="Ej. Pendiente webhook secret de Zoom en producción..."
                className="w-full p-3 bg-white border border-amber-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="checkpoint-chk"
                checked={checkpointCompletado}
                onChange={e => {
                  setCheckpointCompletado(e.target.checked);
                  if (e.target.checked) setEstatus('COMPLETADO');
                }}
                className="w-5 h-5 accent-emerald-600 rounded-lg cursor-pointer"
              />
              <label htmlFor="checkpoint-chk" className="text-sm font-bold text-slate-800 cursor-pointer">
                Marcar Checkpoint Semanal como Finalizado y Aprobado
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="px-5 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="checkpoint-form"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando Checkpoint...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Guardar Checkpoint
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          <UserCheck className="w-4 h-4 text-emerald-200" />
          <span>Checkpoint Semanal Dev</span>
        </button>
      )}

      {mounted && isOpen && createPortal(modalJSX, document.body)}
    </>
  );
}
