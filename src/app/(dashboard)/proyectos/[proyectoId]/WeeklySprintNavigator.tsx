'use client';

import React from 'react';
import {
  Layers,
  Sparkles,
  UserCheck,
  FolderKanban,
  PieChart,
  Calendar,
  Clock,
  ChevronRight,
  Zap,
  TrendingUp
} from 'lucide-react';
import { SprintEstatus } from '@prisma/client';
import AISprintPlannerModal from './AISprintPlannerModal';
import SprintCheckpointModal from './SprintCheckpointModal';

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
  descripcion: string | null;
  horas_dia: number | null;
  dias_semana: number | null;
  sprints: Sprint[];
}

interface Props {
  proyecto: Proyecto;
  selectedSprintId: string | 'ALL';
  onSelectSprint: (sprintId: string | 'ALL') => void;
  viewMode: 'KANBAN' | 'PO_DIGEST';
  onToggleViewMode: (mode: 'KANBAN' | 'PO_DIGEST') => void;
  onRefresh?: () => void;
}

export default function WeeklySprintNavigator({
  proyecto,
  selectedSprintId,
  onSelectSprint,
  viewMode,
  onToggleViewMode,
  onRefresh,
}: Props) {
  const sprints = proyecto.sprints || [];
  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  const activeSprintForCheckpoint = selectedSprint || sprints.find(s => s.estatus === 'EN_CURSO') || sprints[0];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 shadow-sm space-y-3 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sprint selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          <button
            onClick={() => onSelectSprint('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedSprintId === 'ALL'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todos los Sprints ({sprints.length})
          </button>

          {sprints.map((sprint) => {
            const isSelected = selectedSprintId === sprint.id;
            const isCompleted = sprint.estatus === 'COMPLETADO' || sprint.checkpoint_completado;
            const isInProgress = sprint.estatus === 'EN_CURSO';

            return (
              <button
                key={sprint.id}
                onClick={() => onSelectSprint(sprint.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : isInProgress
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Sprint {sprint.numero}</span>
                {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
              </button>
            );
          })}
        </div>

        {/* Controls: PO Mode Toggle & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => onToggleViewMode('KANBAN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
              Tablero Kanban
            </button>

            <button
              onClick={() => onToggleViewMode('PO_DIGEST')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'PO_DIGEST'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-amber-300" />
              Vista PO / Jefe
            </button>
          </div>

          {/* Dev Checkpoint Button */}
          {activeSprintForCheckpoint && (
            <SprintCheckpointModal
              sprint={activeSprintForCheckpoint}
              onUpdate={onRefresh}
            />
          )}

          {/* AI Sprint Planner Trigger */}
          <AISprintPlannerModal
            proyectoId={proyecto.id}
            proyectoNombre={proyecto.nombre}
            descripcionActual={proyecto.descripcion}
            horasDiaActual={proyecto.horas_dia}
            diasSemanaActual={proyecto.dias_semana}
            onSuccess={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}
