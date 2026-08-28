'use client';

import React from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  ChevronRight,
  ShieldCheck,
  User,
  MessageSquare,
  Flame,
  Award
} from 'lucide-react';
import { SprintEstatus, TareaStatus } from '@prisma/client';
import SprintCheckpointModal from './SprintCheckpointModal';

interface Encargado {
  id: string;
  nombre: string;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estatus: TareaStatus;
  prioridad: string;
  categoria: string;
  horas_estimadas: number | null;
  horas_reales: number | null;
  encargados: Encargado[];
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

interface Props {
  proyecto: Proyecto;
  onRefresh?: () => void;
}

export default function POExecutiveDigest({ proyecto, onRefresh }: Props) {
  const sprints = proyecto.sprints || [];

  const totalTareas = sprints.reduce((acc, s) => acc + s.tareas.length, 0);
  const tareasCompletadas = sprints.reduce(
    (acc, s) => acc + s.tareas.filter(t => t.estatus === 'COMPLETADA').length,
    0
  );
  const progresoGeneral = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const totalHorasEst = sprints.reduce((acc, s) => acc + s.horas_estimadas, 0);
  const totalHorasReales = sprints.reduce((acc, s) => acc + s.horas_reales, 0);

  const activeSprint = sprints.find(s => s.estatus === 'EN_CURSO') || sprints[0];
  const totalSprints = sprints.length;
  const sprintsCompletados = sprints.filter(s => s.estatus === 'COMPLETADO').length;

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Title & Status */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Dashboard Product Owner & Jefatura
              </span>
              <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                Cliente: {proyecto.cliente?.nombre || 'Interno'}
              </span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
              {proyecto.nombre}
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
              {proyecto.descripcion || 'Plan de Sprints semanales y seguimiento ejecutivo de entregables sin necesidad de consultas directas.'}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Progreso Global
                </span>
                <span className="text-2xl font-black text-amber-300 font-mono">
                  {progresoGeneral}%
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sprints Finalizados
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {sprintsCompletados} / {totalSprints}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Capacidad Total
                </span>
                <span className="text-2xl font-black text-indigo-300 font-mono">
                  {totalHorasEst} hrs
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Horas Invertidas
                </span>
                <span className="text-2xl font-black text-sky-300 font-mono">
                  {totalHorasReales} hrs
                </span>
              </div>
            </div>
          </div>

          {/* Progress Circular Radial Gauge / AI Summary Card */}
          <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-3xl p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Resumen Ejecutivo IA
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                PROYECTO A TIEMPO 🟢
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-200">
                <span>Avance de entregables</span>
                <span className="font-mono">{tareasCompletadas} de {totalTareas} tareas</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${progresoGeneral}%` }}
                />
              </div>
            </div>

            {activeSprint && (
              <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-indigo-300 font-bold">
                    Sprint Actual en Curso: #{activeSprint.numero}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {formatDate(activeSprint.fecha_inicio)} - {formatDate(activeSprint.fecha_fin)}
                  </span>
                </div>
                <p className="text-xs text-white font-medium line-clamp-2">
                  {activeSprint.nombre}
                </p>
                {activeSprint.notas_checkpoint && (
                  <p className="text-[11px] text-emerald-300 italic bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20">
                    &ldquo;{activeSprint.notas_checkpoint}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sprints Roadmap Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Plan Semanal de Sprints & Checkpoints de Avance
            </h3>
            <p className="text-xs text-slate-500">
              Desglose detallado por semana para revisión del Product Owner sin interferir con el flujo de trabajo del desarrollador.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sprints.map((sprint) => {
            const tareas = sprint.tareas || [];
            const doneTasks = tareas.filter(t => t.estatus === 'COMPLETADA').length;
            const pct = tareas.length > 0 ? Math.round((doneTasks / tareas.length) * 100) : 0;
            const isCompleted = sprint.estatus === 'COMPLETADO' || sprint.checkpoint_completado;
            const isInProgress = sprint.estatus === 'EN_CURSO';

            return (
              <div
                key={sprint.id}
                className={`bg-white rounded-3xl border shadow-sm p-6 space-y-5 transition-all duration-300 hover:shadow-xl relative ${
                  isInProgress
                    ? 'border-indigo-500/50 ring-2 ring-indigo-500/20 bg-gradient-to-b from-indigo-50/30 to-white'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Sprint Header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Sprint #{sprint.numero}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isInProgress
                            ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sprint.estatus}
                      </span>
                      {sprint.checkpoint_completado && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Checkpoint Aprobado
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-slate-800 leading-snug">
                      {sprint.nombre}
                    </h4>
                  </div>

                  <SprintCheckpointModal
                    sprint={sprint}
                    onUpdate={onRefresh}
                  />
                </div>

                {/* Dates & Hours */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Fechas</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {formatDate(sprint.fecha_inicio)} &rarr; {formatDate(sprint.fecha_fin)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Horas (Est / Real)</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {sprint.horas_estimadas}h est / {sprint.horas_reales}h real
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Avance de entregables ({doneTasks}/{tareas.length})</span>
                    <span className="font-mono text-indigo-600 font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Deliverables List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Entregables de la semana:
                  </span>
                  <div className="space-y-2">
                    {tareas.map(tarea => (
                      <div
                        key={tarea.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          tarea.estatus === 'COMPLETADA'
                            ? 'bg-emerald-50/50 border-emerald-100 text-slate-700'
                            : 'bg-white border-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              tarea.estatus === 'COMPLETADA' ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          <span className={`font-semibold truncate ${tarea.estatus === 'COMPLETADA' ? 'line-through text-slate-400' : ''}`}>
                            {tarea.titulo}
                          </span>
                        </div>

                        {tarea.encargados.length > 0 && (
                          <div className="flex -space-x-1 shrink-0 ml-2">
                            {tarea.encargados.map(enc => (
                              <div
                                key={enc.id}
                                className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-white flex items-center justify-center text-[9px]"
                                title={enc.nombre}
                              >
                                {enc.nombre.charAt(0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Developer Notes or Blockers */}
                {(sprint.notas_checkpoint || sprint.bloqueos) && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {sprint.notas_checkpoint && (
                      <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-900">
                        <span className="font-bold block text-emerald-950 mb-0.5 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Logros del Dev Checkpoint:
                        </span>
                        {sprint.notas_checkpoint}
                      </div>
                    )}

                    {sprint.bloqueos && (
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold block text-amber-950 mb-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Bloqueo / Alerta de Jefatura:
                        </span>
                        {sprint.bloqueos}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
