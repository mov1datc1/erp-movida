import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secretEncryption';
import { enrichReportWithSubtasks } from '@/lib/jiraClient';
import type { LexLatinReportData } from '@/types/jiraLexLatin';
import type { LexLatinAgentRequestView } from '@/types/lexLatinAgent';

const PROVIDER = 'LEX_LATIN_AGENT_REQUESTS';
const REPORT_CACHE_PROVIDER = 'LEX_LATIN_REPORT_CACHE';
const MAX_REQUESTS = 100;

type StoredEmailAccount = {
  id: string;
  nombre: string;
  proposito: string;
  nombreRemitente: string;
  email: string;
  usuario: string;
  smtpHost: string;
  smtpPort: number;
  smtpSeguro: boolean;
  imapHost: string;
  imapPort: number;
  imapSeguro: boolean;
  activa: boolean;
  passwordEncrypted: string;
};

function requestsFromConfig(config: unknown): LexLatinAgentRequestView[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return [];
  const requests = (config as { requests?: unknown }).requests;
  return Array.isArray(requests) ? requests as LexLatinAgentRequestView[] : [];
}

async function saveRequests(requests: LexLatinAgentRequestView[]) {
  const trimmed = requests
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt))
    .slice(0, MAX_REQUESTS);
  await prisma.integracion.upsert({
    where: { proveedor: PROVIDER },
    update: { activa: true, config: JSON.parse(JSON.stringify({ requests: trimmed })) },
    create: { proveedor: PROVIDER, activa: true, config: JSON.parse(JSON.stringify({ requests: trimmed })) },
  });
}

async function getAgentEmailAccount(): Promise<StoredEmailAccount> {
  const integration = await prisma.integracion.findUnique({ where: { proveedor: 'EMAIL_ACCOUNTS' } });
  const config = integration?.config as { accounts?: StoredEmailAccount[] } | null;
  const accounts = Array.isArray(config?.accounts) ? config.accounts : [];
  const account = accounts.find((item) => item.activa && item.proposito === 'AGENTES')
    || accounts.find((item) => item.activa && item.proposito === 'NOTIFICACIONES')
    || accounts.find((item) => item.activa && item.proposito === 'GENERAL');
  if (!account?.passwordEncrypted) {
    throw new Error('Configura una cuenta activa con uso “Agentes operativos”, “Notificaciones” o “Uso general”.');
  }
  return account;
}

export async function getLexLatinAgentRequests() {
  const integration = await prisma.integracion.findUnique({ where: { proveedor: PROVIDER } });
  return requestsFromConfig(integration?.config)
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

export async function saveLexLatinReportSnapshot(report: LexLatinReportData) {
  const integration = await prisma.integracion.findUnique({ where: { proveedor: REPORT_CACHE_PROVIDER } });
  const current = integration?.config && typeof integration.config === 'object' && !Array.isArray(integration.config)
    ? (integration.config as { reports?: LexLatinReportData[] }).reports || []
    : [];
  const reports = [report, ...current.filter((item) => item.period !== report.period)]
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 12);
  await prisma.integracion.upsert({
    where: { proveedor: REPORT_CACHE_PROVIDER },
    update: { activa: true, config: JSON.parse(JSON.stringify({ reports })) },
    create: { proveedor: REPORT_CACHE_PROVIDER, activa: true, config: JSON.parse(JSON.stringify({ reports })) },
  });
}

export async function getLatestLexLatinReportSnapshot() {
  const integration = await prisma.integracion.findUnique({ where: { proveedor: REPORT_CACHE_PROVIDER } });
  if (!integration?.config || typeof integration.config !== 'object' || Array.isArray(integration.config)) return null;
  const reports = (integration.config as { reports?: LexLatinReportData[] }).reports;
  if (!Array.isArray(reports) || !reports.length) return null;
  return enrichReportWithSubtasks(reports[0]);
}

function getIssueKeys(report: LexLatinReportData) {
  const keys = new Set<string>();
  for (const issue of report.issues) {
    if (issue.resolvedAt && issue.timeWorkedCumulativeHours <= 0) keys.add(issue.key);
  }
  for (const issue of report.backlog) {
    if (!issue.originalEstimateHours && !issue.targetDate) keys.add(issue.key);
  }
  return [...keys];
}

function buildIssueHtml(report: LexLatinReportData) {
  const missingTime = report.issues.filter((issue) => issue.resolvedAt && issue.timeWorkedCumulativeHours <= 0);
  const missingPlan = report.backlog.filter((issue) => !issue.originalEstimateHours && !issue.targetDate);
  const rows = [
    ...missingTime.map((issue) => `<li><strong>${issue.key}</strong>: tiempo trabajado — ${escapeHtml(issue.summary)}</li>`),
    ...missingPlan.map((issue) => `<li><strong>${issue.key}</strong>: estimación o fecha objetivo — ${escapeHtml(issue.summary)}</li>`),
  ];
  return rows.length ? `<ol>${rows.join('')}</ol>` : '<p>No se detectaron datos críticos faltantes. Esta solicitud valida solamente el circuito de correo.</p>';
}

export async function sendLexLatinValidationEmail(report: LexLatinReportData, recipient: string, mode: 'TEST' | 'LIVE' = 'LIVE') {
  const account = await getAgentEmailAccount();
  const requests = await getLexLatinAgentRequests();
  const folio = `LEX-${report.period.replace('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const prefix = mode === 'TEST' ? '[PRUEBA CONTROLADA] ' : '';
  const subject = `${prefix}[Movida LexLatin][${folio}] Validación operativa ${report.periodLabel}`;
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSeguro,
    auth: { user: account.usuario, pass: decryptSecret(account.passwordEncrypted) },
    tls: { rejectUnauthorized: true },
  });
  await transporter.verify();
  const result = await transporter.sendMail({
    from: `"${account.nombreRemitente.replaceAll('"', '')}" <${account.email}>`,
    to: recipient,
    replyTo: account.email,
    subject,
    text: [
      `Hola Edgar,`,
      '',
      mode === 'TEST' 
        ? 'Esta es una prueba controlada del agente de Soporte LexLatin. No modificará Jira.' 
        : `Como parte del cierre del periodo ${report.periodLabel}, el agente detectó casos que requieren validación de horas o estimación para cerrar el informe mensual.`,
      `Folio: ${folio}`,
      '',
      ...report.qualityWarnings.map((warning) => `- ${warning}`),
      '',
      'Por favor responde este mismo correo sin cambiar el asunto. Puedes indicar horas trabajadas, fecha objetivo, estado o correcciones.',
      'Ejemplo: MDS-1697: 3 horas. MDS-1696: fecha objetivo 5/nov.',
      '',
      'Movida ERP · Agente de Soporte LexLatin',
    ].join('\n'),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.55"><div style="max-width:680px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><p style="font-size:12px;font-weight:bold;color:#2563eb;text-transform:uppercase">Movida ERP · Agente de Soporte LexLatin</p><h2>${mode === 'TEST' ? 'Prueba controlada de validación' : `Validación operativa requerida — ${report.periodLabel}`}</h2><p>Hola Edgar,</p><p>${mode === 'TEST' ? '<strong>Esta es una prueba y no modificará Jira.</strong> Queremos confirmar que el agente puede enviar la solicitud y recibir tu respuesta.' : `Se generó el corte mensual para <strong>${report.periodLabel}</strong>. Encontré datos que requieren validación u horas trabajadas para conciliar los tickets en el informe.`}</p><p><strong>Folio:</strong> ${folio}</p>${buildIssueHtml(report)}<div style="background:#eff6ff;border-radius:12px;padding:16px;margin:20px 0"><strong>¿Cómo responder?</strong><br>Responde este mismo correo sin cambiar el asunto. Puedes escribir, por ejemplo:<br><em>MDS-1697: 3 horas. MDS-1696: fecha objetivo 5/nov.</em></div><p>Gracias.</p></div></body></html>`,
  });
  const request: LexLatinAgentRequestView = {
    id: randomUUID(),
    folio,
    period: report.period,
    type: 'OPERATIONS_VALIDATION',
    status: 'SENT',
    mode,
    recipient: recipient.toLowerCase(),
    sender: account.email.toLowerCase(),
    subject,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    smtpAccepted: Array.isArray(result.accepted) ? result.accepted.map(String) : [],
    smtpRejected: Array.isArray(result.rejected) ? result.rejected.map(String) : [],
    smtpPending: Array.isArray(result.pending) ? result.pending.map(String) : [],
    smtpResponse: typeof result.response === 'string' ? result.response : undefined,
    issueKeys: getIssueKeys(report),
    warnings: report.qualityWarnings,
  };
  await saveRequests([request, ...requests]);
  console.info('[LexLatin agent] Validation email accepted by SMTP', {
    folio,
    sender: request.sender,
    recipient: request.recipient,
    messageId: request.messageId,
    accepted: request.smtpAccepted,
    rejected: request.smtpRejected,
    response: request.smtpResponse,
  });
  return request;
}

export async function sendLexLatinDeliveryApprovalEmail(
  report: LexLatinReportData,
  recipient: string,
  operationalResponseText?: string | null
) {
  const account = await getAgentEmailAccount();
  const requests = await getLexLatinAgentRequests();
  const folio = `LEX-ENTREGA-${report.period.replace('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const subject = `[Movida LexLatin][${folio}] Solicitud de Aprobación de Entrega — Informe ${report.periodLabel}`;

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSeguro,
    auth: { user: account.usuario, pass: decryptSecret(account.passwordEncrypted) },
    tls: { rejectUnauthorized: true },
  });
  await transporter.verify();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app';

  const operationalSectionHtml = operationalResponseText
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0">
        <strong style="color:#166534">✅ Validación Operativa Recibida (Edgar Reyes):</strong>
        <div style="font-size:13px;color:#1e293b;margin-top:8px;white-space:pre-wrap">${escapeHtml(operationalResponseText.slice(0, 500))}</div>
       </div>`
    : `<div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:16px;margin:20px 0">
        <strong style="color:#92400e">ℹ️ Validación Operativa:</strong>
        <p style="margin:4px 0 0 0;font-size:13px;color:#78350f">Revisión automática de datos completada por el agente.</p>
       </div>`;

  const html = `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;background-color:#f8fafc;padding:24px 12px;margin:0">
  <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#ffffff">
      <p style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin:0;opacity:0.85">Movida ERP · Dirección de Operaciones</p>
      <h2 style="margin:8px 0 0 0;font-size:20px;font-weight:800;color:#ffffff">Aprobación de Entrega — Soporte LexLatin</h2>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0">Hola Jonathan,</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px 0">
        El informe mensual de Soporte LexLatin para <strong>${report.periodLabel}</strong> está conciliado y listo para autorizar el despacho final a <strong>Edith Santos</strong>.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:20px">
        <h4 style="margin:0 0 12px 0;font-size:13px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px">Métricas del Periodo (${report.periodLabel})</h4>
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0"><td style="color:#64748b">Casos creados en el mes:</td><td align="right" style="font-weight:800;color:#0f172a">${report.metrics.created}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0"><td style="color:#64748b">Casos resueltos:</td><td align="right" style="font-weight:800;color:#0f172a">${report.metrics.resolved}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0"><td style="color:#64748b">Backlog al cierre:</td><td align="right" style="font-weight:800;color:#0f172a">${report.metrics.backlog}</td></tr>
          <tr style="border-bottom:1px solid #e2e8f0"><td style="color:#64748b">Horas efectivas trabajadas:</td><td align="right" style="font-weight:800;color:#2563eb">${report.metrics.workedHours} h</td></tr>
          <tr><td style="color:#64748b">Promedio de dedicación por ticket:</td><td align="right" style="font-weight:800;color:#0f172a">${report.metrics.averageWorkedHoursPerTicket} h</td></tr>
        </table>
      </div>

      ${operationalSectionHtml}

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:20px 0">
        <strong style="color:#1e40af;font-size:13px">Borrador para Edith Santos (edith.santos@lexlatin.com):</strong>
        <p style="font-size:13px;color:#1e3a8a;margin:6px 0 0 0;line-height:1.5">
          "Estimada Edith, compartimos el informe consolidado de servicio y soporte correspondiente a ${report.periodLabel}, incluyendo detalle de casos creados (${report.metrics.created}), cerrados (${report.metrics.resolved}), horas de esfuerzo (${report.metrics.workedHours} h) y estado de backlog..."
        </p>
      </div>

      <div style="text-align:center;margin-top:28px">
        <a href="${appUrl}/soporte-lexlatin" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:700;box-shadow:0 4px 6px -1px rgba(37,99,235,0.25)">
          Autorizar Entrega en Movida ERP ➔
        </a>
      </div>
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center">
      Folio: ${folio} · Movida ERP Agente de Soporte LexLatin
    </div>
  </div>
</body>
</html>`;

  const result = await transporter.sendMail({
    from: `"${account.nombreRemitente.replaceAll('"', '')}" <${account.email}>`,
    to: recipient,
    replyTo: account.email,
    subject,
    text: [
      `Hola Jonathan,`,
      '',
      `El informe mensual de Soporte LexLatin para ${report.periodLabel} está listo para su aprobación de entrega.`,
      `Folio: ${folio}`,
      '',
      `Métricas principales:`,
      `- Creados: ${report.metrics.created}`,
      `- Resueltos: ${report.metrics.resolved}`,
      `- Horas trabajadas: ${report.metrics.workedHours} h`,
      `- Backlog: ${report.metrics.backlog}`,
      '',
      `Puedes revisarlo y autorizarlo directamente en: ${appUrl}/soporte-lexlatin`,
      '',
      `Movida ERP · Agente de Soporte LexLatin`,
    ].join('\n'),
    html,
  });

  const request: LexLatinAgentRequestView = {
    id: randomUUID(),
    folio,
    period: report.period,
    type: 'DELIVERY_APPROVAL',
    status: 'SENT',
    mode: 'LIVE',
    recipient: recipient.toLowerCase(),
    sender: account.email.toLowerCase(),
    subject,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    smtpAccepted: Array.isArray(result.accepted) ? result.accepted.map(String) : [],
    smtpRejected: Array.isArray(result.rejected) ? result.rejected.map(String) : [],
    smtpPending: Array.isArray(result.pending) ? result.pending.map(String) : [],
    smtpResponse: typeof result.response === 'string' ? result.response : undefined,
    issueKeys: [],
    warnings: report.qualityWarnings,
  };

  await saveRequests([request, ...requests]);
  return request;
}

export async function sendLexLatinFinalDeliveryEmail(
  report: LexLatinReportData,
  recipientTo: string,
  recipientCc: string
) {
  const account = await getAgentEmailAccount();
  const requests = await getLexLatinAgentRequests();
  const folio = `LEX-FINAL-${report.period.replace('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const subject = `[Movida TCI] Informe Mensual de Servicio y Soporte LexLatin — ${report.periodLabel}`;

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSeguro,
    auth: { user: account.usuario, pass: decryptSecret(account.passwordEncrypted) },
    tls: { rejectUnauthorized: true },
  });
  await transporter.verify();

  const ccList = recipientCc
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean);

  const html = `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;background-color:#f8fafc;padding:24px 12px;margin:0">
  <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
    <div style="padding:28px;background:linear-gradient(135deg,#059669 0%,#0d9488 100%);color:#ffffff">
      <p style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin:0;opacity:0.85">Movida TCI · Mesa de Servicio</p>
      <h2 style="margin:8px 0 0 0;font-size:22px;font-weight:800;color:#ffffff">Informe Mensual de Soporte y Desarrollo</h2>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#334155;margin:0 0 16px 0">Estimada Edith Santos,</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px 0">
        A continuación compartimos el resumen consolidado de las actividades de servicio, soporte y requerimientos atendidos por el equipo de Movida TCI durante el periodo de <strong>${report.periodLabel}</strong>.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px">
        <h3 style="margin:0 0 14px 0;font-size:14px;font-weight:800;color:#0f172a">Resumen Ejecutivo de Indicadores</h3>
        <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="color:#64748b">Casos creados en el mes:</td>
            <td align="right" style="font-weight:800;color:#0f172a">${report.metrics.created}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="color:#64748b">Casos resueltos satisfactoriamente:</td>
            <td align="right" style="font-weight:800;color:#059669">${report.metrics.resolved}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="color:#64748b">Casos en backlog / seguimiento continuo:</td>
            <td align="right" style="font-weight:800;color:#0f172a">${report.metrics.backlog}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="color:#64748b">Total de horas efectivas dedicadas en el mes:</td>
            <td align="right" style="font-weight:800;color:#2563eb">${report.metrics.workedHours} horas</td>
          </tr>
          <tr>
            <td style="color:#64748b">Tiempo promedio de dedicación por ticket:</td>
            <td align="right" style="font-weight:800;color:#0f172a">${report.metrics.averageWorkedHoursPerTicket} horas</td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#475569;line-height:1.6">
        Las memorias completas y planillas de conciliación han sido registradas y avaladas por la dirección de entrega de Movida TCI. Si requieres cualquier revisión puntual de los casos, quedamos a tu completa disposición.
      </p>

      <p style="margin-top:24px;font-size:14px;color:#334155;font-weight:600">
        Atentamente,<br>
        <span style="color:#0f172a;font-weight:800">Equipo Movida TCI</span>
      </p>
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center">
      Folio de entrega: ${folio} · Generado automáticamente por Movida ERP
    </div>
  </div>
</body>
</html>`;

  const result = await transporter.sendMail({
    from: `"${account.nombreRemitente.replaceAll('"', '')}" <${account.email}>`,
    to: recipientTo,
    cc: ccList,
    replyTo: account.email,
    subject,
    text: [
      `Estimada Edith Santos,`,
      '',
      `Compartimos el informe mensual de soporte y servicio de LexLatin para ${report.periodLabel}.`,
      `Folio: ${folio}`,
      '',
      `- Casos creados: ${report.metrics.created}`,
      `- Casos resueltos: ${report.metrics.resolved}`,
      `- Backlog al cierre: ${report.metrics.backlog}`,
      `- Horas dedicadas en el mes: ${report.metrics.workedHours} h`,
      '',
      `Quedamos a su disposición para cualquier duda.`,
      '',
      `Atentamente,`,
      `Equipo Movida TCI`,
    ].join('\n'),
    html,
  });

  const request: LexLatinAgentRequestView = {
    id: randomUUID(),
    folio,
    period: report.period,
    type: 'FINAL_DELIVERY',
    status: 'DELIVERED',
    mode: 'LIVE',
    recipient: recipientTo.toLowerCase(),
    sender: account.email.toLowerCase(),
    subject,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    smtpAccepted: Array.isArray(result.accepted) ? result.accepted.map(String) : [],
    smtpRejected: Array.isArray(result.rejected) ? result.rejected.map(String) : [],
    smtpPending: Array.isArray(result.pending) ? result.pending.map(String) : [],
    smtpResponse: typeof result.response === 'string' ? result.response : undefined,
    issueKeys: [],
    warnings: [],
  };

  await saveRequests([request, ...requests]);
  return request;
}

export async function pollLexLatinEmailReplies(approverEmail: string) {
  const account = await getAgentEmailAccount();
  const requests = await getLexLatinAgentRequests();
  const pending = requests.filter((request) => request.status === 'SENT');
  if (!pending.length) return { matched: 0, requests };

  const earliest = new Date(Math.min(...pending.map((request) => Date.parse(request.sentAt))));
  earliest.setDate(earliest.getDate() - 1);
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSeguro,
    auth: { user: account.usuario, pass: decryptSecret(account.passwordEncrypted) },
    logger: false,
  });
  let matched = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ since: earliest });
      const recentUids = Array.isArray(uids) ? uids.slice(-250) : [];
      if (!recentUids.length) return { matched: 0, requests };
      for await (const message of client.fetch(recentUids, { uid: true, envelope: true, source: true }, { uid: true })) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        const from = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
        if (from !== approverEmail.toLowerCase()) continue;
        const subject = parsed.subject || '';
        const request = pending.find((item) => subject.includes(item.folio));
        if (!request || request.status !== 'SENT') continue;
        request.status = 'RESPONDED';
        request.responseAt = parsed.date?.toISOString() || new Date().toISOString();
        request.responseFrom = from;
        request.responseText = (parsed.text || parsed.html?.toString() || '').trim().slice(0, 12_000);
        matched += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  if (matched) await saveRequests(requests);
  return { matched, requests };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
}
