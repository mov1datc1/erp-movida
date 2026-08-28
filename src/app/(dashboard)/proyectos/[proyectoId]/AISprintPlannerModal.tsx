'use client';

import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, Loader2, X, Zap, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateAISprints } from '@/app/actions/sprints';

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  descripcionActual?: string | null;
  horasDiaActual?: number | null;
  diasSemanaActual?: number | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export default function AISprintPlannerModal({
  proyectoId,
  proyectoNombre,
  descripcionActual,
  horasDiaActual = 6,
  diasSemanaActual = 5,
  onSuccess,
  triggerButton,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [alcance, setAlcance] = useState(
    descripcionActual ||
      'Portal del Alumno (Les Rois): Autenticación con aislamiento de roles/grupos, Panel de administración de usuarios y horarios, Zoom API Server-to-Server OAuth para clases virtuales en vivo, e Inteligencia Artificial con Context Engineering para tutorías personalizadas.'
  );
  const [semanas, setSemanas] = useState(4);
  const [horasDia, setHorasDia] = useState(horasDiaActual || 6);
  const [diasSemana, setDiasSemana] = useState(diasSemanaActual || 5);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const horasSemanales = horasDia * diasSemana;
  const capacidadTotal = horasSemanales * semanas;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alcance.trim()) {
      setErrorMsg('El alcance del proyecto no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResultMsg(null);

    const res = await generateAISprints({
      proyectoId,
      alcance: alcance.trim(),
      semanas,
      horasDia,
      diasSemana,
    });

    setIsLoading(false);

    if (res.success) {
      setResultMsg(res.message || 'Sprints e hitos semanales generados con éxito');
      setTimeout(() => {
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al generar los sprints.');
    }
  };

  const setTemplatePortalAlumno = () => {
    setAlcance(
      'Portal del Alumno (Les Rois): Autenticación con aislamiento de roles/grupos, Panel de administración de usuarios y horarios, Zoom API Server-to-Server OAuth para clases virtuales en vivo, e Inteligencia Artificial con Context Engineering para tutorías personalizadas.'
    );
    setSemanas(4);
    setHorasDia(6);
    setDiasSemana(5);
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Generar Plan de Sprints IA</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-indigo-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 text-white relative shrink-0">
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 p-0.5 shadow-lg">
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                      <Zap className="w-6 h-6 text-amber-300" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                      IA Sprint Architect
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Generador de Sprints: {proyectoNombre}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => !isLoading && setIsOpen(false)}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Define el alcance y la carga horaria diaria para que la IA estructure los Sprints semanales, entregables y asignación de capacidad de tu equipo.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {errorMsg && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {resultMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-medium border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>{resultMsg}</div>
                </div>
              )}

              {/* Template quick fill */}
              <div className="flex justify-between items-center bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-900">
                    ¿Usar plantilla demostrativa del Portal del Alumno?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={setTemplatePortalAlumno}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Cargar Plantilla
                </button>
              </div>

              <form id="sprint-ai-form" onSubmit={handleGenerate} className="space-y-5">
                {/* Scope */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Alcance del Proyecto / Requerimientos Técnicos
                  </label>
                  <textarea
                    value={alcance}
                    onChange={(e) => setAlcance(e.target.value)}
                    rows={4}
                    required
                    placeholder="Describe los módulos, características y entregables del proyecto..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-sm font-medium text-slate-800"
                  />
                </div>

                {/* Grid Inputs: Semanas, Horas por día, Días por semana */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      SEMANAS
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={semanas}
                        onChange={(e) => setSemanas(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                      />
                      <span className="text-xs text-slate-500 font-semibold">Sprints</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      HORAS / DÍA
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={horasDia}
                        onChange={(e) => setHorasDia(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                      />
                      <span className="text-xs text-slate-500 font-semibold">hrs/dev/día</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      DÍAS / SEMANA
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={diasSemana}
                        onChange={(e) => setDiasSemana(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                      />
                      <span className="text-xs text-slate-500 font-semibold">días/sem</span>
                    </div>
                  </div>
                </div>

                {/* Capacity summary badge */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-4 rounded-2xl text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Cálculo de Capacidad Estimada
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {semanas} semanas &times; {diasSemana} días &times; {horasDia} hrs/día por desarrollador
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-300 font-mono">
                      {capacidadTotal} hrs
                    </span>
                    <p className="text-[10px] font-semibold text-slate-400">Total Proyecto</p>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
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
                form="sprint-ai-form"
                disabled={isLoading}
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    Diseñando Sprints con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Generar Sprints y Entregables
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
