'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, BarChart3, Bot, CalendarDays, CheckCircle2, Clock3,
  FileSpreadsheet, FileText, Loader2, MailCheck, Printer, RefreshCw, Send, Settings2, ShieldCheck, TicketCheck,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { checkLexLatinValidationReplies, loadCachedLexLatinReport, loadLexLatinAgentRequests, sendLexLatinValidationTest, syncLexLatinMonthlyReport } from './actions';
import type { JiraIssueSnapshot, JiraLexLatinConfigView, LexLatinReportData } from '@/types/jiraLexLatin';
import type PptxGenJS from 'pptxgenjs';
import type { LexLatinAgentRequestView } from '@/types/lexLatinAgent';

export default function SoporteLexLatinClient({ initialConfig, defaultPeriod }: { initialConfig: JiraLexLatinConfigView | null; defaultPeriod: string }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [report, setReport] = useState<LexLatinReportData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'pptx' | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [agentRequests, setAgentRequests] = useState<LexLatinAgentRequestView[]>([]);
  const [agentBusy, setAgentBusy] = useState<'send' | 'check' | null>(null);

  const ready = Boolean(initialConfig?.activa && initialConfig.tokenConfigured);
  useEffect(() => {
    let active = true;
    Promise.all([loadLexLatinAgentRequests(), loadCachedLexLatinReport()]).then(([requestsResult, reportResult]) => {
      if (!active) return;
      if (requestsResult.success && requestsResult.data) setAgentRequests(requestsResult.data);
      if (reportResult.success && reportResult.data) {
        setReport(reportResult.data);
        setPeriod(reportResult.data.period);
      }
    });
    return () => { active = false; };
  }, []);
  const handledIssues = useMemo(() => report?.issues.filter((issue) => {
    const month = report.period;
    return dateKeyInMexico(issue.updatedAt)?.startsWith(month)
      || dateKeyInMexico(issue.createdAt)?.startsWith(month)
      || (issue.resolvedAt && dateKeyInMexico(issue.resolvedAt)?.startsWith(month));
  }) || [], [report]);

  const sync = async () => {
    setSyncing(true);
    setFeedback(null);
    const result = await syncLexLatinMonthlyReport(period);
    setSyncing(false);
    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible sincronizar.' });
      return;
    }
    setReport(result.data);
    setFeedback({ success: true, message: `Sincronización terminada: ${result.data.issues.length} tickets conciliados.` });
  };

  const sendValidationTest = async () => {
    if (!report) return;
    setAgentBusy('send');
    setFeedback(null);
    const result = await sendLexLatinValidationTest(period);
    setAgentBusy(null);
    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible enviar la solicitud.' });
      return;
    }
    setAgentRequests((current) => [result.data, ...current]);
    setFeedback({ success: true, message: `Prueba ${result.data.folio} enviada a Edgar. No se modificará Jira.` });
  };

  const checkReplies = async () => {
    setAgentBusy('check');
    setFeedback(null);
    const result = await checkLexLatinValidationReplies();
    setAgentBusy(null);
    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible revisar el correo.' });
      return;
    }
    setAgentRequests(result.data.requests);
    setFeedback({ success: true, message: result.data.matched ? `Se procesaron ${result.data.matched} respuesta(s) de Edgar.` : 'Aún no hay una respuesta nueva de Edgar.' });
  };

  const exportExcel = async () => {
    if (!report) return;
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const rows = report.issues.map((issue) => ({
        'Tipo de incidencia': issue.issueType,
        Clave: issue.key,
        Resumen: issue.summary,
        'Creada (Ciudad de México)': formatDateTimeMexico(issue.createdAt),
        'Horas trabajadas en el mes': issue.timeWorkedHours,
        Complejidad: complexityLabel(issue.timeWorkedHours),
        Estado: issue.status,
        Resolución: issue.resolution || '',
        'Persona asignada': issue.assignee || '',
        Informador: issue.reporter || '',
        Prioridad: issue.priority || '',
        Impacto: issue.impact || '',
        'Actualizada (Ciudad de México)': formatDateTimeMexico(issue.updatedAt),
        'Fecha de resolución (Ciudad de México)': issue.resolvedAt ? formatDateTimeMexico(issue.resolvedAt) : '',
        'Tiempo total de resolución (horas)': issue.resolutionHours ?? '',
        'Estimación original (horas)': issue.originalEstimateHours ?? '',
        'Fecha estimada de término': issue.targetDate ? formatDate(issue.targetDate) : '',
        'Incidencias enlazadas': issue.linkedIssueKeys.join('; '),
        Enlace: issue.url,
      }));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:Q1' };
      sheet['!cols'] = [18, 12, 55, 24, 20, 22, 18, 16, 16, 22, 28, 12, 24, 26, 24, 22, 24, 22, 42].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, sheet, 'Tickets conciliados');
      const summary = XLSX.utils.json_to_sheet([
        { Indicador: 'Casos creados', Valor: report.metrics.created },
        { Indicador: 'Casos resueltos', Valor: report.metrics.resolved },
        { Indicador: 'Backlog al cierre', Valor: report.metrics.backlog },
        { Indicador: 'Horas trabajadas en el mes', Valor: report.metrics.workedHours },
        { Indicador: 'Tickets con tiempo registrado', Valor: report.metrics.ticketsWithWorkedHours },
        { Indicador: 'Horas efectivas promedio por ticket', Valor: report.metrics.averageWorkedHoursPerTicket },
        { Indicador: 'Casos de alta dedicación (>6 h)', Valor: handledIssues.filter((issue) => issue.timeWorkedHours > 6).length },
        { Indicador: 'Tiempo calendario promedio hasta cierre (h)', Valor: report.metrics.averageResolutionHours },
        { Indicador: 'Mediana calendario hasta cierre (h)', Valor: report.metrics.medianResolutionHours },
      ]);
      XLSX.utils.book_append_sheet(workbook, summary, 'Resumen');
      const complexityRows = hourBuckets(handledIssues).flatMap((bucket) => bucket.issues.map((issue) => ({
        Nivel: bucket.label,
        'Cantidad del nivel': bucket.cases,
        Clave: issue.key,
        Título: issue.summary,
        'Horas del mes': issue.timeWorkedHours,
      })));
      const complexity = XLSX.utils.json_to_sheet(complexityRows);
      complexity['!autofilter'] = { ref: complexity['!ref'] || 'A1:E1' };
      complexity['!cols'] = [22, 18, 12, 65, 18].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, complexity, 'Complejidad');
      XLSX.writeFile(workbook, `JIRA_LexLatin_${report.period}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const exportPowerPoint = async () => {
    if (!report) return;
    setExporting('pptx');
    try {
      const pptxModule = await import('pptxgenjs');
      const PptxGenerator = pptxModule.default;
      const pptx = new PptxGenerator();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'Movida TCI';
      pptx.company = 'Movida TCI';
      pptx.subject = `Soporte LexLatin ${report.periodLabel}`;
      pptx.title = `Informe Jira LexLatin — ${report.periodLabel}`;
      pptx.theme = {
        headFontFace: 'Aptos Display', bodyFontFace: 'Aptos',
      };

      const colors = { navy: '12233F', blue: '2563EB', cyan: '06B6D4', green: '16865B', pink: 'D14A9B', amber: 'D97706', pale: 'F5F7FB', text: '24324A' };
      const tableCell = (value: string | number) => ({ text: String(value) });
      const addFooter = (slide: PptxGenJS.Slide, number: number) => {
        slide.addText('No vendemos, transformamos!', { x: 0.55, y: 7.12, w: 4.2, h: 0.2, fontSize: 9, color: '64748B' });
        slide.addText(String(number), { x: 12.35, y: 7.07, w: 0.4, h: 0.25, fontSize: 10, color: '64748B', align: 'right' });
      };
      const addTitle = (slide: PptxGenJS.Slide, title: string, number: number) => {
        slide.background = { color: 'FFFFFF' };
        slide.addText(title, { x: 0.65, y: 0.35, w: 11.8, h: 0.45, fontSize: 24, bold: true, color: colors.navy });
        slide.addShape(pptx.ShapeType.line, { x: 0.65, y: 0.92, w: 12, h: 0, line: { color: colors.blue, width: 2 } });
        addFooter(slide, number);
      };

      let slide = pptx.addSlide();
      slide.background = { color: colors.navy };
      slide.addText('Movida TCI', { x: 0.75, y: 0.65, w: 3.3, h: 0.5, fontSize: 25, bold: true, color: 'FFFFFF' });
      slide.addText('INFORME DE SOPORTE', { x: 0.75, y: 2.15, w: 7.5, h: 0.5, fontSize: 18, bold: true, color: colors.cyan, charSpacing: 2 });
      slide.addText('LexLatin', { x: 0.75, y: 2.75, w: 8, h: 0.8, fontSize: 42, bold: true, color: 'FFFFFF' });
      slide.addText(report.periodLabel.toUpperCase(), { x: 0.78, y: 3.72, w: 7, h: 0.4, fontSize: 20, color: 'DCE7F7' });
      slide.addText('Casos, horas, cumplimiento y proyección del backlog', { x: 0.78, y: 4.35, w: 7.8, h: 0.45, fontSize: 17, color: 'FFFFFF' });
      slide.addShape(pptx.ShapeType.arc, { x: 9.4, y: 1.25, w: 2.7, h: 2.7, rotate: 20, line: { color: colors.cyan, width: 6, transparency: 15 }, fill: { color: colors.navy, transparency: 100 } });

      slide = pptx.addSlide();
      addTitle(slide, `Resumen ejecutivo — ${report.periodLabel}`, 2);
      const cards: Array<[string, string | number, string]> = [
        ['Creados', report.metrics.created, colors.pink], ['Resueltos', report.metrics.resolved, colors.green],
        ['Backlog', report.metrics.backlog, colors.amber], ['Horas del mes', report.metrics.workedHours, colors.blue],
      ];
      cards.forEach(([label, value, color], index) => {
        const x = 0.75 + index * 3.08;
        slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: 2.75, h: 1.25, rectRadius: 0.08, fill: { color: colors.pale }, line: { color: 'E2E8F0' } });
        slide.addText(String(value), { x: x + 0.18, y: 1.5, w: 2.35, h: 0.45, fontSize: 28, bold: true, color });
        slide.addText(String(label), { x: x + 0.18, y: 2.02, w: 2.35, h: 0.25, fontSize: 12, bold: true, color: colors.text });
      });
      slide.addText('Lectura del reporte', { x: 0.8, y: 3.05, w: 3.5, h: 0.35, fontSize: 18, bold: true, color: colors.navy });
      slide.addText([
        { text: 'Tiempo trabajado', options: { bold: true } }, { text: ' = horas efectivamente invertidas por el equipo.\n' },
        { text: 'Tiempo de resolución', options: { bold: true } }, { text: ' = tiempo calendario desde la apertura hasta el cierre.\n' },
        { text: 'Backlog', options: { bold: true } }, { text: ' = casos que seguían pendientes al terminar el mes.' },
      ], { x: 0.8, y: 3.52, w: 5.8, h: 1.5, fontSize: 15, breakLine: false, color: colors.text, valign: 'middle', margin: 0.08 });
      slide.addText(`Esfuerzo promedio: ${report.metrics.averageWorkedHoursPerTicket} h/ticket (${report.metrics.ticketsWithWorkedHours} con tiempo)\nTiempo calendario promedio: ${report.metrics.averageResolutionHours} h\nMediana calendario: ${report.metrics.medianResolutionHours} h\nBacklog >30 días: ${report.metrics.olderThan30Days}`, { x: 7.15, y: 3.25, w: 4.8, h: 1.75, fontSize: 16, bold: true, color: colors.navy, fill: { color: 'EEF5FF' }, margin: 0.25, breakLine: true });

      slide = pptx.addSlide();
      addTitle(slide, 'Casos creados vs. resueltos', 3);
      slide.addChart(pptx.ChartType.line, [
        { name: 'Creados', labels: report.daily.map((point) => point.label), values: report.daily.map((point) => point.created) },
        { name: 'Resueltos', labels: report.daily.map((point) => point.label), values: report.daily.map((point) => point.resolved) },
      ], { x: 0.7, y: 1.2, w: 12, h: 4.75, showLegend: true, legendPos: 'b', showTitle: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 10, chartColors: [colors.pink, colors.green], showValue: false, lineSize: 3 });
      slide.addText('Cada punto representa el día en que se creó o resolvió el ticket. La diferencia entre ambas curvas no equivale por sí sola al backlog, porque también pueden resolverse casos de meses anteriores.', { x: 0.85, y: 6.15, w: 11.6, h: 0.55, fontSize: 12, color: '475569', fill: { color: 'F8FAFC' }, margin: 0.12 });

      slide = pptx.addSlide();
      addTitle(slide, 'Backlog y fecha estimada de término', 4);
      const backlogRows = report.backlog.slice(0, 12).map((issue) => [issue.key, issue.summary, issue.status, ageDays(issue, report.endDate), issue.originalEstimateHours ?? '—', issue.targetDate ? formatDate(issue.targetDate) : 'Sin fecha'].map(tableCell));
      slide.addTable([
        [{ text: 'Clave' }, { text: 'Resumen' }, { text: 'Estado' }, { text: 'Días' }, { text: 'Est. h' }, { text: 'Fecha objetivo' }],
        ...backlogRows,
      ], { x: 0.55, y: 1.2, w: 12.25, h: 4.9, border: { color: 'CBD5E1', pt: 0.6 }, fill: { color: 'FFFFFF' }, color: colors.text, fontSize: 10, margin: 0.08, rowH: 0.32, colW: [0.85, 5.25, 1.4, 0.65, 0.7, 1.5], bold: false });
      slide.addText(`${report.metrics.backlogWithoutEstimate} caso(s) sin estimación o fecha objetivo. Estos casos deben revisarse y comunicar una expectativa al usuario antes del siguiente informe.`, { x: 0.75, y: 6.25, w: 11.8, h: 0.45, fontSize: 12, bold: true, color: report.metrics.backlogWithoutEstimate ? '9A3412' : colors.green, fill: { color: report.metrics.backlogWithoutEstimate ? 'FFF7ED' : 'ECFDF5' }, margin: 0.12 });

      slide = pptx.addSlide();
      addTitle(slide, 'Horas invertidas por complejidad', 5);
      const buckets = hourBuckets(handledIssues);
      slide.addChart(pptx.ChartType.bar, [{ name: 'Horas del mes', labels: buckets.map((bucket) => bucket.label), values: buckets.map((bucket) => bucket.monthHours) }], { x: 0.75, y: 1.25, w: 7.2, h: 4.8, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, chartColors: [colors.blue], showValue: true, showLegend: false, showTitle: false });
      slide.addTable([
        [{ text: 'Nivel' }, { text: 'Casos' }, { text: 'Horas mes' }],
        ...buckets.map((bucket) => [bucket.label, bucket.cases, Number(bucket.monthHours.toFixed(2))].map(tableCell)),
        ['Total', buckets.reduce((sum, bucket) => sum + bucket.cases, 0), Number(buckets.reduce((sum, bucket) => sum + bucket.monthHours, 0).toFixed(2))].map(tableCell),
      ], { x: 8.05, y: 1.65, w: 4.7, h: 2.75, border: { color: 'CBD5E1', pt: 0.7 }, fill: { color: 'FFFFFF' }, color: colors.text, fontSize: 11, margin: 0.1, colW: [2.7, 0.8, 1.2] });
      slide.addText('Nivel 1: hasta 2 h  •  Nivel 2: más de 2 y hasta 6 h  •  Nivel 3: más de 6 h', { x: 8.35, y: 4.55, w: 4.1, h: 0.75, fontSize: 12, color: '475569', fill: { color: 'F8FAFC' }, margin: 0.15 });

      const complexityRows = buckets.flatMap((bucket) => bucket.issues.map((issue) => ({ bucket, issue })));
      const rowsPerSlide = 13;
      for (let index = 0; index < complexityRows.length; index += rowsPerSlide) {
        const pageRows = complexityRows.slice(index, index + rowsPerSlide);
        slide = pptx.addSlide();
        addTitle(slide, `Detalle de tickets por complejidad${complexityRows.length > rowsPerSlide ? ` — ${Math.floor(index / rowsPerSlide) + 1}` : ''}`, 6 + Math.floor(index / rowsPerSlide));
        slide.addTable([
          [{ text: 'Nivel' }, { text: 'Clave' }, { text: 'Título' }, { text: 'Horas mes' }],
          ...pageRows.map(({ bucket, issue }) => [bucket.label, issue.key, issue.summary, issue.timeWorkedHours].map(tableCell)),
        ], { x: 0.55, y: 1.2, w: 12.25, h: 5.6, border: { color: 'CBD5E1', pt: 0.6 }, fill: { color: 'FFFFFF' }, color: colors.text, fontSize: 9.5, margin: 0.07, rowH: 0.35, colW: [1.9, 1, 8.1, 1.25] });
      }

      slide = pptx.addSlide();
      addTitle(slide, 'Calidad de datos y próximos pasos', 6 + Math.max(1, Math.ceil(complexityRows.length / rowsPerSlide)));
      const warnings = report.qualityWarnings.length ? report.qualityWarnings : ['No se detectaron omisiones críticas para el periodo.'];
      slide.addText(warnings.map((warning) => ({ text: `• ${warning}\n`, options: { bullet: false, breakLine: true } })), { x: 0.85, y: 1.35, w: 5.8, h: 2.6, fontSize: 17, color: colors.text, margin: 0.1, valign: 'top' });
      slide.addText('Flujo de aprobación', { x: 7.05, y: 1.35, w: 4.8, h: 0.35, fontSize: 19, bold: true, color: colors.navy });
      slide.addText(`1. El agente concilia y propone correcciones.\n2. ${initialConfig?.approverOperationsEmail || 'Edgar'} aprueba cambios en Jira.\n3. Se regenera y valida el reporte.\n4. ${initialConfig?.approverDeliveryEmail || 'Jonathan'} aprueba el envío.\n5. Se remite a ${initialConfig?.recipientTo || 'Edith'}.`, { x: 7.05, y: 1.85, w: 5.05, h: 2.25, fontSize: 15, color: colors.text, breakLine: true, margin: 0.14, fill: { color: 'F1F5F9' } });
      slide.addText('Próximo objetivo: todos los casos abiertos deben tener responsable, horas estimadas y fecha objetivo comunicada.', { x: 0.85, y: 4.65, w: 11.3, h: 0.85, fontSize: 20, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF', fill: { color: colors.blue }, margin: 0.18 });

      await pptx.writeFile({ fileName: `Soporte_MOVIDA_LexLatin_${report.period}.pptx` });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 print:space-y-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600"><Bot className="h-4 w-4" /> Agentes operativos</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Soporte LexLatin</h1>
          <p className="mt-1 max-w-3xl text-slate-500">Conciliación mensual de Jira, control del backlog y generación del informe para Edith.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-slate-600">Periodo<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" /></label>
          <button onClick={sync} disabled={!ready || syncing} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar Jira</button>
        </div>
      </header>

      {!ready && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-bold">Falta conectar Jira</h2><p className="mt-1 text-sm">Guarda un token API y activa Jira / LexLatin en Configuración.</p></div></div>
          <Link href="/configuracion" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-bold text-white"><Settings2 className="h-4 w-4" /> Abrir configuración</Link>
        </div>
      )}

      {feedback && <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm print:hidden ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{feedback.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{feedback.message}</div>}

      {!report ? <EmptyState configured={ready} /> : (
        <>
          <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 p-7 text-white shadow-xl print:bg-white print:p-0 print:text-slate-900 print:shadow-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Informe mensual</p><h2 className="mt-1 text-2xl font-black capitalize">{report.periodLabel}</h2></div><p className="text-xs text-slate-300">Generado {new Date(report.generatedAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · CDMX</p></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Creados" value={report.metrics.created} icon={<TicketCheck />} color="pink" />
              <Metric label="Resueltos" value={report.metrics.resolved} icon={<CheckCircle2 />} color="green" />
              <Metric label="Backlog al cierre" value={report.metrics.backlog} icon={<Clock3 />} color="amber" />
              <Metric label="Horas trabajadas en el mes" value={report.metrics.workedHours} icon={<BarChart3 />} color="blue" />
            </div>
          </section>

          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">Creados vs. resueltos</h3>
              <p className="mt-1 text-xs text-slate-500">Cada punto es el día de creación o resolución; puede incluir cierres de casos iniciados en meses anteriores.</p>
              <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={report.daily}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="created" name="Creados" stroke="#d14a9b" strokeWidth={3} /><Line type="monotone" dataKey="resolved" name="Resueltos" stroke="#16865b" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
              <TopWorkedCasesChart issues={handledIssues} />
            </div>
            <div className="space-y-4">
              <Insight label="Horas efectivas promedio por ticket" value={`${report.metrics.averageWorkedHoursPerTicket} h`} detail={`${report.metrics.workedHours} h del mes ÷ ${report.metrics.ticketsWithWorkedHours} ticket(s) con tiempo registrado`} />
              <Insight label="Tiempo calendario promedio hasta cierre" value={`${report.metrics.averageResolutionHours} h`} detail={`Desde creación hasta resolución · Mediana: ${report.metrics.medianResolutionHours} h`} />
              <Insight label="Casos de alta dedicación" value={String(handledIssues.filter((issue) => issue.timeWorkedHours > 6).length)} detail="Tickets con más de 6 horas registradas durante el mes." warning={handledIssues.some((issue) => issue.timeWorkedHours > 6)} />
              <Insight label="Backlog mayor de 30 días" value={String(report.metrics.olderThan30Days)} detail="Requiere explicación y plan de cierre." warning={report.metrics.olderThan30Days > 0} />
              <Insight label="Sin estimación o fecha objetivo" value={String(report.metrics.backlogWithoutEstimate)} detail="Punto solicitado por Edith." warning={report.metrics.backlogWithoutEstimate > 0} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Backlog al cierre</h3><p className="mt-1 text-xs text-slate-500">Casos pendientes al último día del periodo, con antigüedad y expectativa de terminación.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{report.backlog.length} casos</span></div>
            <IssueTable issues={report.backlog} endDate={report.endDate} />
          </section>

          <ComplexityTable issues={handledIssues} />

          <ImpactTable issues={handledIssues} />

          {report.qualityWarnings.length > 0 && <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5"><h3 className="flex items-center gap-2 font-bold text-orange-900"><AlertTriangle className="h-5 w-5" /> Validaciones antes de aprobar</h3><ul className="mt-3 space-y-2 text-sm text-orange-900/80">{report.qualityWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></section>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-bold text-slate-900">Archivos del reporte</h3><p className="mt-1 text-sm text-slate-500">Genera los entregables después de revisar las alertas.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportExcel} disabled={Boolean(exporting)} className="report-button"><FileSpreadsheet className="h-4 w-4" /> {exporting === 'xlsx' ? 'Generando…' : 'Descargar Excel'}</button><button onClick={exportPowerPoint} disabled={Boolean(exporting)} className="report-button"><FileText className="h-4 w-4" /> {exporting === 'pptx' ? 'Generando…' : 'Descargar PowerPoint'}</button><button onClick={() => window.print()} className="report-button"><Printer className="h-4 w-4" /> Guardar PDF</button></div></div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 print:hidden">
            <ApprovalCard icon={<ShieldCheck />} title="Aprobación operativa" email={initialConfig?.approverOperationsEmail || 'edgar.reyes@movidatci.com'} detail="Autoriza comentarios, horas y cambios de estado en Jira." status="Prueba de correo disponible" />
            <ApprovalCard icon={<Send />} title="Aprobación de entrega" email={initialConfig?.approverDeliveryEmail || 'jonathan@movidatci.com'} detail={`Autoriza el correo final para ${initialConfig?.recipientTo || 'Edith'}.`} status="Disponible después de la aprobación operativa" />
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div><h3 className="flex items-center gap-2 font-bold text-blue-950"><MailCheck className="h-5 w-5" /> Prueba controlada con Edgar</h3><p className="mt-1 max-w-3xl text-sm text-blue-900/70">Envía por correo las omisiones detectadas. La respuesta se recibe por IMAP y se muestra aquí; durante esta prueba el agente no modificará Jira.</p></div>
              <div className="flex flex-wrap gap-2"><button onClick={sendValidationTest} disabled={Boolean(agentBusy)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{agentBusy === 'send' ? 'Enviando…' : 'Enviar prueba a Edgar'}</button><button onClick={checkReplies} disabled={Boolean(agentBusy)} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 disabled:opacity-50">{agentBusy === 'check' ? 'Revisando…' : 'Revisar respuestas'}</button></div>
            </div>
            {agentRequests.length > 0 && <div className="mt-4 space-y-3">{agentRequests.slice(0, 5).map((request) => {
              const smtpRejected = request.smtpRejected || [];
              const smtpAccepted = request.smtpAccepted || [];
              const acceptedBySmtp = Boolean(request.messageId) && smtpRejected.length === 0;
              return <article key={request.id} className="rounded-xl border border-blue-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-bold text-slate-900">{request.folio}</p><p className="text-xs text-slate-500">Enviado {new Date(request.sentAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} a {request.recipient}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${request.status === 'RESPONDED' ? 'bg-emerald-100 text-emerald-800' : acceptedBySmtp ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{request.status === 'RESPONDED' ? 'Respuesta recibida' : acceptedBySmtp ? 'Aceptado por SMTP' : 'Esperando evidencia SMTP'}</span>
                </div>
                <dl className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                  <div><dt className="font-bold text-slate-700">Remitente</dt><dd>{request.sender || 'Cuenta del agente configurada'}</dd></div>
                  <div><dt className="font-bold text-slate-700">Aceptado para</dt><dd>{smtpAccepted.length ? smtpAccepted.join(', ') : request.recipient}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-slate-700">Message-ID</dt><dd className="break-all font-mono">{request.messageId || 'No registrado'}</dd></div>
                  {request.smtpResponse && <div className="sm:col-span-2"><dt className="font-bold text-slate-700">Respuesta SMTP</dt><dd className="break-words font-mono">{request.smtpResponse}</dd></div>}
                  {smtpRejected.length > 0 && <div className="sm:col-span-2 text-red-700"><dt className="font-bold">Rechazado para</dt><dd>{smtpRejected.join(', ')}</dd></div>}
                </dl>
                <p className="mt-2 text-xs text-slate-500">La aceptación SMTP confirma que el servidor recibió el mensaje; la entrega final depende del servidor destinatario y sus filtros de spam.</p>
                {request.responseText && <div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{request.responseText}</div>}
              </article>;
            })}</div>}
          </section>
        </>
      )}

      <style jsx global>{`
        .report-button { display:inline-flex; align-items:center; gap:.5rem; border:1px solid rgb(203 213 225); background:white; border-radius:.75rem; padding:.625rem .875rem; color:rgb(51 65 85); font-size:.875rem; font-weight:700; }
        .report-button:hover { background:rgb(248 250 252); }
        .report-button:disabled { opacity:.5; cursor:not-allowed; }
        @media print { aside, nav { display:none !important; } main { margin-left:0 !important; } body { background:white !important; } }
      `}</style>
    </div>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: string | number; icon: ReactNode; color: 'pink' | 'green' | 'amber' | 'blue' }) {
  const styles = { pink: 'bg-pink-500/15 text-pink-200', green: 'bg-emerald-500/15 text-emerald-200', amber: 'bg-amber-500/15 text-amber-200', blue: 'bg-blue-500/15 text-blue-200' };
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-slate-200 print:bg-white"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[color]}`}>{icon}</div><p className="mt-3 text-3xl font-black">{value}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-slate-500">{label}</p></div>;
}

function Insight({ label, value, detail, warning }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${warning ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white'}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${warning ? 'text-orange-700' : 'text-slate-900'}`}>{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}

function IssueTable({ issues, endDate }: { issues: JiraIssueSnapshot[]; endDate: string }) {
  if (!issues.length) return <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No había tickets pendientes al cierre del mes.</p>;
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Clave</th><th className="px-3 py-3">Resumen</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Antigüedad</th><th className="px-3 py-3">Estimación</th><th className="px-3 py-3">Fecha objetivo</th></tr></thead><tbody className="divide-y divide-slate-100">{issues.map((issue) => <tr key={issue.key} className="align-top"><td className="px-3 py-3 font-bold text-blue-700"><a href={issue.url} target="_blank" rel="noreferrer">{issue.key}</a></td><td className="max-w-lg px-3 py-3 font-medium text-slate-800">{issue.summary}</td><td className="px-3 py-3 text-slate-600">{issue.status}</td><td className="px-3 py-3 text-slate-600">{ageDays(issue, endDate)} días</td><td className="px-3 py-3 text-slate-600">{issue.originalEstimateHours ? `${issue.originalEstimateHours} h` : 'Sin horas'}</td><td className={`px-3 py-3 ${issue.targetDate ? 'text-slate-600' : 'font-bold text-orange-700'}`}>{issue.targetDate ? formatDate(issue.targetDate) : 'Sin fecha'}</td></tr>)}</tbody></table></div>;
}

function ComplexityTable({ issues }: { issues: JiraIssueSnapshot[] }) {
  const buckets = hourBuckets(issues);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-bold text-slate-900">Tickets por complejidad</h3>
        <p className="mt-1 text-xs text-slate-500">La complejidad se determina por las horas efectivamente registradas durante el mes.</p>
      </div>
      <div className="mt-5 space-y-5">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
              <h4 className="font-bold text-slate-800">{bucket.label}</h4>
              <div className="flex gap-2 text-xs font-bold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1">{bucket.cases} caso(s)</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{Number(bucket.monthHours.toFixed(2))} h del mes</span>
              </div>
            </div>
            {bucket.issues.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Clave</th><th className="px-4 py-2">Título</th><th className="px-4 py-2">Horas mes</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{bucket.issues.map((issue) => <tr key={issue.key}><td className="px-4 py-2 font-bold text-blue-700"><a href={issue.url} target="_blank" rel="noreferrer">{issue.key}</a></td><td className="px-4 py-2 text-slate-800">{issue.summary}</td><td className="px-4 py-2 text-slate-600">{issue.timeWorkedHours} h</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="px-4 py-3 text-sm text-slate-400">Sin tickets en este nivel.</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ImpactTable({ issues }: { issues: JiraIssueSnapshot[] }) {
  const groups = Object.entries(issues.reduce<Record<string, JiraIssueSnapshot[]>>((result, issue) => {
    const key = issue.impact || 'Sin impacto registrado';
    (result[key] ||= []).push(issue);
    return result;
  }, {})).sort((a, b) => b[1].length - a[1].length);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">Impacto reportado en Jira</h3>
      <p className="mt-1 text-xs text-slate-500">Impacto describe alcance o afectación; la complejidad se calcula separadamente con las horas trabajadas.</p>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Impacto</th><th className="px-3 py-3">Cantidad</th><th className="px-3 py-3">Tickets</th><th className="px-3 py-3">Horas del mes</th></tr></thead><tbody className="divide-y divide-slate-100">{groups.map(([impact, group]) => <tr key={impact}><td className="px-3 py-3 font-semibold text-slate-800">{impact}</td><td className="px-3 py-3 text-slate-600">{group.length}</td><td className="px-3 py-3 text-blue-700">{group.map((issue) => issue.key).join(', ')}</td><td className="px-3 py-3 text-slate-600">{Number(group.reduce((sum, issue) => sum + issue.timeWorkedHours, 0).toFixed(2))} h</td></tr>)}</tbody></table></div>
    </section>
  );
}

function TopWorkedCasesChart({ issues }: { issues: JiraIssueSnapshot[] }) {
  const data = [...issues]
    .filter((issue) => issue.timeWorkedHours > 0)
    .sort((a, b) => b.timeWorkedHours - a.timeWorkedHours)
    .slice(0, 3)
    .map((issue) => ({ key: issue.key, hours: issue.timeWorkedHours, title: issue.summary }));
  return (
    <div className="mt-7 border-t border-slate-100 pt-5">
      <h3 className="font-bold text-slate-900">Top 3 tickets por horas trabajadas</h3>
      <p className="mt-1 text-xs text-slate-500">Casos que concentraron más esfuerzo efectivo durante el mes.</p>
      {data.length ? <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} /><XAxis type="number" unit=" h" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="key" width={75} tick={{ fontSize: 11, fontWeight: 700 }} /><Tooltip formatter={(value) => [`${value} h`, 'Horas del mes']} labelFormatter={(key) => data.find((item) => item.key === key)?.title || key} /><Bar dataKey="hours" name="Horas del mes" fill="#2563eb" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay horas registradas para construir el ranking.</p>}
    </div>
  );
}

function EmptyState({ configured }: { configured: boolean }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center print:hidden"><CalendarDays className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-bold text-slate-800">{configured ? 'Selecciona el mes y sincroniza Jira' : 'Configura Jira para iniciar'}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">El agente conciliará tickets creados, resueltos, horas trabajadas y backlog antes de preparar los archivos.</p></div>;
}

function ApprovalCard({ icon, title, email, detail, status }: { icon: ReactNode; title: string; email: string; detail: string; status: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">{icon}</div><div><h3 className="font-bold text-slate-900">{title}</h3><p className="text-sm font-semibold text-blue-700">{email}</p><p className="mt-2 text-sm text-slate-500">{detail}</p><span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{status}</span></div></div></div>;
}

function ageDays(issue: JiraIssueSnapshot, endDate: string) {
  const createdKey = dateKeyInMexico(issue.createdAt);
  if (!createdKey) return 0;
  return Math.max(0, Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${createdKey}T00:00:00Z`)) / 86_400_000));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(value));
}

function formatDateTimeMexico(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(value));
}

function dateKeyInMexico(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function complexityLabel(hours: number) {
  if (hours <= 0) return 'Sin tiempo';
  if (hours <= 2) return 'Nivel 1 (≤2 h)';
  if (hours <= 6) return 'Nivel 2 (2–6 h)';
  return 'Nivel 3 (>6 h)';
}

function hourBuckets(issues: JiraIssueSnapshot[]) {
  const buckets = [
    { label: 'Nivel 1 (≤2 h)', cases: 0, monthHours: 0, issues: [] as JiraIssueSnapshot[] },
    { label: 'Nivel 2 (2–6 h)', cases: 0, monthHours: 0, issues: [] as JiraIssueSnapshot[] },
    { label: 'Nivel 3 (>6 h)', cases: 0, monthHours: 0, issues: [] as JiraIssueSnapshot[] },
    { label: 'Sin tiempo', cases: 0, monthHours: 0, issues: [] as JiraIssueSnapshot[] },
  ];
  for (const issue of issues) {
    const hours = issue.timeWorkedHours;
    const bucket = hours <= 0 ? buckets[3] : hours <= 2 ? buckets[0] : hours <= 6 ? buckets[1] : buckets[2];
    bucket.cases += 1;
    bucket.monthHours += issue.timeWorkedHours;
    bucket.issues.push(issue);
  }
  return buckets;
}
