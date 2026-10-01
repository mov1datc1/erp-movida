import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secretEncryption';
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
  return Array.isArray(reports) && reports.length ? reports[0] : null;
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

export async function sendLexLatinValidationEmail(report: LexLatinReportData, recipient: string, mode: 'TEST' | 'LIVE' = 'TEST') {
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
      mode === 'TEST' ? 'Esta es una prueba controlada del agente de Soporte LexLatin. No modificará Jira.' : 'El agente encontró datos que requieren validación antes del cierre.',
      `Folio: ${folio}`,
      '',
      ...report.qualityWarnings.map((warning) => `- ${warning}`),
      '',
      'Por favor responde este mismo correo sin cambiar el asunto. Puedes indicar horas, fecha objetivo, estado o cualquier corrección.',
      'Ejemplo: MDS-1640: 2 horas. MDS-1627: fecha objetivo 4/oct.',
      '',
      'Movida ERP · Agente de Soporte LexLatin',
    ].join('\n'),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.55"><div style="max-width:680px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;padding:28px"><p style="font-size:12px;font-weight:bold;color:#2563eb;text-transform:uppercase">Movida ERP · Agente de Soporte LexLatin</p><h2>${mode === 'TEST' ? 'Prueba controlada de validación' : 'Validación operativa requerida'}</h2><p>Hola Edgar,</p><p>${mode === 'TEST' ? '<strong>Esta es una prueba y no modificará Jira.</strong> Queremos confirmar que el agente puede enviar la solicitud y recibir tu respuesta.' : 'Encontré datos que requieren validación antes del cierre.'}</p><p><strong>Folio:</strong> ${folio}</p>${buildIssueHtml(report)}<div style="background:#eff6ff;border-radius:12px;padding:16px;margin:20px 0"><strong>¿Cómo responder?</strong><br>Responde este mismo correo sin cambiar el asunto. Puedes escribir, por ejemplo:<br><em>MDS-1640: 2 horas. MDS-1627: fecha objetivo 4/oct.</em></div><p>Gracias.</p></div></body></html>`,
  });
  const request: LexLatinAgentRequestView = {
    id: randomUUID(),
    folio,
    period: report.period,
    status: 'SENT',
    mode,
    recipient: recipient.toLowerCase(),
    subject,
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    issueKeys: getIssueKeys(report),
    warnings: report.qualityWarnings,
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
