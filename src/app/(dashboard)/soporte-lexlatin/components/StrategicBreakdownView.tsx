'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Sparkles,
  GraduationCap,
  FolderGit2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Clock,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { JiraIssueSnapshot } from '@/types/jiraLexLatin';
import {
  calculateStrategicBreakdown,
  generateEmailBulletsForEdith,
  ClassifiedJiraIssue,
} from '@/lib/lexLatinClassification';

interface Props {
  issues: JiraIssueSnapshot[];
  periodLabel: string;
}

export default function StrategicBreakdownView({ issues, periodLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACUERDOS' | 'CAMPUS' | 'PROYECTOS' | 'AREAS'>('ACUERDOS');
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const summary = useMemo(() => calculateStrategicBreakdown(issues), [issues]);

  const handleCopyBullets = () => {
    const text = generateEmailBulletsForEdith(summary, periodLabel);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const { byAgreement, byArea, efficiency, campusIssues, projectIssues } = summary;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Clasificación Ejecutiva de Acuerdos
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
              Solicitado por Edith Santos
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            Desglose Estratégico y Alcance — {periodLabel}
          </h3>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Distinción formal entre fallas de mantenimiento, mejoras operativas, solicitudes de Campus y proyectos fuera del alcance original.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowExplanationModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Ver diferencia entre Casos Productivos y Casos Complejos"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" /> Glosario Productivos vs Complejos
          </button>
          <button
            onClick={handleCopyBullets}
            className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado al Portapapeles!' : 'Copiar Puntos para Correo'}
          </button>
        </div>
      </div>

      {/* Tarjeta de Claridad Operativa: 49 Brutos vs 38 Productivos */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Bruto Jira</span>
          <span className="text-3xl font-black text-white">{efficiency.totalRawTickets}</span>
          <span className="text-xs text-slate-400 block mt-0.5">Tickets generados en el mes</span>
        </div>
        <div className="border-l border-white/10 md:pl-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 block">Hilos de Correo Duplicados</span>
          <span className="text-3xl font-black text-rose-400">-{efficiency.duplicatesCount}</span>
          <span className="text-xs text-slate-300 block mt-0.5">Respuestas "Re:..." consolidadas</span>
        </div>
        <div className="border-l border-white/10 md:pl-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">Casos Netos Atendidos</span>
          <span className="text-3xl font-black text-emerald-400">{efficiency.netProductiveTickets}</span>
          <span className="text-xs text-slate-300 block mt-0.5">~1 requerimiento por día hábil</span>
        </div>
        <div className="border-l border-white/10 md:pl-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">Casos Complejos (+6h)</span>
          <span className="text-3xl font-black text-amber-400">{efficiency.complexTicketsCount}</span>
          <span className="text-xs text-amber-200/80 block mt-0.5">{efficiency.complexTicketsHours} h (70% del esfuerzo técnico)</span>
        </div>
      </div>

      {/* Los 4 Cuadrantes de Acuerdos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fallas / Mantenimiento Correctivo */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full uppercase">
              Mantenimiento
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Fallas Correctivas</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-rose-950">{byAgreement.fallasCount}</span>
              <span className="text-xs font-semibold text-rose-700">({byAgreement.fallasHours} h)</span>
            </div>
            <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
              Bugs en Drupal, pérdida de borradores por edición simultánea y parches de seguridad en PHP.
            </p>
          </div>
        </div>

        {/* 2. Mejoras Operativas */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full uppercase">
              Operativo
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Mejoras Operativas</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-blue-950">{byAgreement.mejorasCount}</span>
              <span className="text-xs font-semibold text-blue-700">({byAgreement.mejorasHours} h)</span>
            </div>
            <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
              Búsquedas con autocompletado, ajuste de industrias en Ágora y control de caché del Home.
            </p>
          </div>
        </div>

        {/* 3. Campus LexLatin & Marketing */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full uppercase">
              Campus & Ventas
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Campus LexLatin</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-950">{byAgreement.campusCount}</span>
              <span className="text-xs font-semibold text-emerald-700">({byAgreement.campusHours} h)</span>
            </div>
            <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
              Landing pages del Programa Ejecutivo, página de gracias, tag de LinkedIn y boletines.
            </p>
          </div>
        </div>

        {/* 4. Nuevos Proyectos (Fuera de Alcance) */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <FolderGit2 className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full uppercase">
              Cotizable
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Nuevos Proyectos</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-purple-950">{byAgreement.proyectosCount}</span>
              <span className="text-xs font-semibold text-purple-700">({byAgreement.proyectosHours} h)</span>
            </div>
            <p className="text-xs text-purple-800/80 mt-1 leading-relaxed">
              Iniciativas fuera de alcance (Webhook AyudanteX, PerfilPlus comercial, DataStudio, RC2/RC3).
            </p>
          </div>
        </div>
      </div>

      {/* Tabs para Inspección Detallada */}
      <div className="space-y-4 pt-2">
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ACUERDOS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ACUERDOS'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Distribución por Áreas
          </button>
          <button
            onClick={() => setActiveTab('CAMPUS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'CAMPUS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Solicitudes de Campus ({campusIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('PROYECTOS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'PROYECTOS'
                ? 'border-purple-600 text-purple-700 bg-purple-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" /> Proyectos Fuera de Alcance ({projectIssues.length})
          </button>
        </div>

        {/* Tab 1: Distribución por Áreas */}
        {activeTab === 'ACUERDOS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Volumen de Requerimientos por Área
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Operación Editorial & Redacción (Drupal)</span>
                    <span className="font-mono text-slate-700">{byArea.editorialCount} tickets ({byArea.editorialHours} h)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(byArea.editorialCount / (efficiency.netProductiveTickets || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Ágora, PerfilPlus & Plataformas Comerciales</span>
                    <span className="font-mono text-slate-700">{byArea.agoraCount} tickets ({byArea.agoraHours} h)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(byArea.agoraCount / (efficiency.netProductiveTickets || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Campus LexLatin & Marketing Digital</span>
                    <span className="font-mono text-slate-700">{byArea.campusCount} tickets ({byArea.campusHours} h)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(byArea.campusCount / (efficiency.netProductiveTickets || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Infraestructura & Soporte Técnico General</span>
                    <span className="font-mono text-slate-700">{byArea.infraCount} tickets ({byArea.infraHours} h)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(byArea.infraCount / (efficiency.netProductiveTickets || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Justificación de Esfuerzo para Edith
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El 70% del tiempo técnico del mes se concentró en <strong>estabilizar la operación editorial</strong> (resolver de raíz la pérdida de borradores por edición simultánea en Drupal) y en la <strong>mitigación de la vulnerabilidad crítica de PHP</strong> en servidores.
                </p>
                <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Valor Entregado a LexLatin:
                  </p>
                  <p className="text-[11px] text-slate-600">
                    • Cero pérdida de notas periodísticas en producción.<br />
                    • Campañas de Campus con Landings y LinkedIn Tag operativas.<br />
                    • Protección total contra exploits de seguridad de PHP.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Promedio real de peticiones:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  &lt; 1 requerimiento / día hábil
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Lista Específica de Campus */}
        {activeTab === 'CAMPUS' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Clave</th>
                  <th className="py-3 px-4">Iniciativa de Campus</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campusIssues.map((issue) => (
                  <tr key={issue.key} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        {issue.key} <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {issue.summary}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {issue.reporter || 'Campus'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {issue.timeWorkedHours > 0 ? `${issue.timeWorkedHours} h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Lista de Nuevos Proyectos */}
        {activeTab === 'PROYECTOS' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Clave</th>
                  <th className="py-3 px-4">Iniciativa Fuera de Alcance</th>
                  <th className="py-3 px-4">Estatus Comercial</th>
                  <th className="py-3 px-4">Acción Requerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectIssues.map((issue) => (
                  <tr key={issue.key} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-600 whitespace-nowrap">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        {issue.key} <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {issue.summary}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      Cotización y Aprobación de Edith / Fernando
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Explicativo: Casos Productivos vs Casos Complejos */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-slate-900">
                Diferencia Operativa: Productivos vs. Complejos
              </h4>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">1. Casos Productivos (38 casos):</span>
                Son aquellos tickets de Jira que tuvieron impacto real sobre la plataforma de producción y fueron efectivamente atendidos o resueltos durante el mes. Excluye réplicas automáticas de correos duplicados.
              </div>

              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200">
                <span className="font-bold text-indigo-950 block mb-1">2. Casos Complejos (+6h, 10 casos):</span>
                No son opuestos a productivos; son una <strong>subdivisión de alta intensidad</strong>. Involucran cambios a nivel de código fuente en Drupal, resolución de vulnerabilidades críticas de PHP o depuración de bases de datos. Absorbieron 228 de las 323 horas del mes.
              </div>
            </div>

            <button
              onClick={() => setShowExplanationModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

