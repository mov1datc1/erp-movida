import 'server-only';

import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secretEncryption';
import type {
  JiraFieldOption,
  JiraIssueSnapshot,
  JiraLexLatinConfigView,
  LexLatinDailyPoint,
  LexLatinReportData,
} from '@/types/jiraLexLatin';

export interface StoredJiraLexLatinConfig extends Omit<JiraLexLatinConfigView, 'tokenConfigured'> {
  apiTokenEncrypted: string;
}

type JiraFields = Record<string, unknown>;

interface JiraIssueResponse {
  id: string;
  key: string;
  fields: JiraFields;
}

export async function getStoredJiraLexLatinConfig(): Promise<StoredJiraLexLatinConfig | null> {
  const integration = await prisma.integracion.findUnique({
    where: { proveedor: 'JIRA_LEXLATIN' },
  });

  if (!integration?.config || typeof integration.config !== 'object' || Array.isArray(integration.config)) {
    return null;
  }

  return integration.config as unknown as StoredJiraLexLatinConfig;
}

export function toJiraConfigView(config: StoredJiraLexLatinConfig | null): JiraLexLatinConfigView | null {
  if (!config) return null;
  const { apiTokenEncrypted, ...safe } = config;
  return { ...safe, tokenConfigured: Boolean(apiTokenEncrypted) };
}

function normalizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

async function jiraRequest<T>(config: StoredJiraLexLatinConfig, path: string, init?: RequestInit): Promise<T> {
  if (!config.activa) throw new Error('La integración de Jira para LexLatin está inactiva.');
  if (!config.apiTokenEncrypted) throw new Error('No hay un token API de Jira configurado.');

  const response = await fetch(`${normalizeSiteUrl(config.siteUrl)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.accountEmail}:${decryptSecret(config.apiTokenEncrypted)}`).toString('base64')}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    const detail = body.length > 500 ? `${body.slice(0, 500)}…` : body;
    throw new Error(`Jira respondió ${response.status}: ${detail || response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function testJiraConnection(config?: StoredJiraLexLatinConfig) {
  const stored = config || await getStoredJiraLexLatinConfig();
  if (!stored) throw new Error('Configura Jira antes de probar la conexión.');

  const [myself, project, fields] = await Promise.all([
    jiraRequest<{ displayName: string; emailAddress?: string }>(stored, '/rest/api/3/myself'),
    jiraRequest<{ key: string; name: string }>(stored, `/rest/api/3/project/${encodeURIComponent(stored.projectKey)}`),
    getJiraFields(stored),
  ]);

  return {
    user: myself.displayName,
    email: myself.emailAddress || stored.accountEmail,
    project,
    fields,
    suggestedTimeField: findSuggestedField(fields, ['tiempo trabajado', 'time worked', 'worked time']),
    suggestedTargetField: findSuggestedField(fields, ['fecha de terminación', 'fecha estimada', 'target date', 'due date']),
  };
}

export async function getJiraFields(config?: StoredJiraLexLatinConfig): Promise<JiraFieldOption[]> {
  const stored = config || await getStoredJiraLexLatinConfig();
  if (!stored) throw new Error('Configura Jira antes de consultar sus campos.');
  const fields = await jiraRequest<Array<{ id: string; name: string; schema?: { type?: string } }>>(stored, '/rest/api/3/field');
  return fields
    .map((field) => ({ id: field.id, name: field.name, schemaType: field.schema?.type }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function findSuggestedField(fields: JiraFieldOption[], names: string[]) {
  return fields.find((field) => names.some((name) => field.name.toLocaleLowerCase('es').includes(name)));
}

async function searchAllIssues(config: StoredJiraLexLatinConfig, jql: string, fields: string[]): Promise<JiraIssueResponse[]> {
  const issues: JiraIssueResponse[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      jql,
      fields: fields.join(','),
      maxResults: '100',
    });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);

    const page = await jiraRequest<{
      issues?: JiraIssueResponse[];
      nextPageToken?: string;
      isLast?: boolean;
    }>(config, `/rest/api/3/search/jql?${params.toString()}`);

    issues.push(...(page.issues || []));
    nextPageToken = page.isLast ? undefined : page.nextPageToken;
  } while (nextPageToken);

  return issues;
}

function asNamedValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    for (const key of ['displayName', 'name', 'value', 'emailAddress']) {
      if (typeof item[key] === 'string') return item[key] as string;
    }
  }
  return null;
}

function parseHours(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const normalized = value.toLowerCase().replace(',', '.');
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return 0;
  if (normalized.includes('min')) return number / 60;
  return number;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    for (const key of ['date', 'value', 'endTime']) {
      const candidate = item[key];
      if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) return new Date(candidate).toISOString();
    }
  }
  return null;
}

function mapIssue(config: StoredJiraLexLatinConfig, issue: JiraIssueResponse): JiraIssueSnapshot {
  const fields = issue.fields;
  const createdAt = String(fields.created || '');
  const resolvedAt = typeof fields.resolutiondate === 'string' ? fields.resolutiondate : null;
  const status = (fields.status || {}) as Record<string, unknown>;
  const statusCategory = (status.statusCategory || {}) as Record<string, unknown>;
  const timetracking = (fields.timetracking || {}) as Record<string, unknown>;
  const links = Array.isArray(fields.issuelinks) ? fields.issuelinks : [];
  const standardSeconds = Number(fields.timespent || timetracking.timeSpentSeconds || 0);
  const customWorked = config.timeWorkedFieldId ? fields[config.timeWorkedFieldId] : undefined;
  const targetValue = config.targetDateFieldId ? fields[config.targetDateFieldId] : undefined;
  const createdMs = Date.parse(createdAt);
  const resolvedMs = resolvedAt ? Date.parse(resolvedAt) : Number.NaN;

  return {
    id: issue.id,
    key: issue.key,
    summary: String(fields.summary || ''),
    issueType: asNamedValue(fields.issuetype) || 'Solicitud',
    status: asNamedValue(fields.status) || 'Sin estado',
    statusCategory: asNamedValue(status.statusCategory) || String(statusCategory.key || ''),
    resolution: asNamedValue(fields.resolution),
    priority: asNamedValue(fields.priority),
    assignee: asNamedValue(fields.assignee),
    reporter: asNamedValue(fields.reporter),
    createdAt,
    updatedAt: String(fields.updated || createdAt),
    resolvedAt,
    dueDate: parseDateValue(fields.duedate),
    targetDate: parseDateValue(targetValue) || parseDateValue(fields.duedate),
    timeWorkedHours: customWorked === undefined || customWorked === null
      ? (Number.isFinite(standardSeconds) ? standardSeconds / 3600 : 0)
      : parseHours(customWorked),
    originalEstimateHours: Number.isFinite(Number(timetracking.originalEstimateSeconds))
      ? Number(timetracking.originalEstimateSeconds) / 3600
      : null,
    resolutionHours: Number.isFinite(createdMs) && Number.isFinite(resolvedMs)
      ? Math.max(0, (resolvedMs - createdMs) / 3_600_000)
      : null,
    linkedIssueKeys: links.flatMap((link) => {
      if (!link || typeof link !== 'object') return [];
      const item = link as Record<string, unknown>;
      const inward = item.inwardIssue as Record<string, unknown> | undefined;
      const outward = item.outwardIssue as Record<string, unknown> | undefined;
      return [inward?.key, outward?.key].filter((key): key is string => typeof key === 'string');
    }),
    url: `${normalizeSiteUrl(config.siteUrl)}/browse/${issue.key}`,
  };
}

function dateInRange(value: string | null, startMs: number, endMs: number) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= startMs && time < endMs;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function monthRange(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('El periodo debe tener formato AAAA-MM.');
  const [year, month] = period.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('El mes seleccionado no es válido.');
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function buildDailyPoints(start: Date, end: Date, issues: JiraIssueSnapshot[]): LexLatinDailyPoint[] {
  const formatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const points: LexLatinDailyPoint[] = [];
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({
      date: key,
      label: formatter.format(cursor),
      created: issues.filter((issue) => issue.createdAt.slice(0, 10) === key).length,
      resolved: issues.filter((issue) => issue.resolvedAt?.slice(0, 10) === key).length,
    });
  }
  return points;
}

export async function buildLexLatinMonthlyReport(period: string): Promise<LexLatinReportData> {
  const config = await getStoredJiraLexLatinConfig();
  if (!config) throw new Error('Configura la integración Jira / LexLatin antes de sincronizar.');
  const { start, end } = monthRange(period);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const customFields = [config.timeWorkedFieldId, config.targetDateFieldId].filter(Boolean);
  const requestedFields = [
    'summary', 'issuetype', 'status', 'resolution', 'priority', 'assignee', 'reporter',
    'created', 'updated', 'resolutiondate', 'duedate', 'timetracking', 'timespent', 'issuelinks',
    ...customFields,
  ];
  const jql = `project = ${config.projectKey} AND (created < "${endDate}" OR updated >= "${startDate}") ORDER BY created DESC`;
  const rawIssues = await searchAllIssues(config, jql, requestedFields);
  const issues = rawIssues.map((issue) => mapIssue(config, issue));
  const startMs = start.getTime();
  const endMs = end.getTime();
  const created = issues.filter((issue) => dateInRange(issue.createdAt, startMs, endMs));
  const resolved = issues.filter((issue) => dateInRange(issue.resolvedAt, startMs, endMs));
  const updated = issues.filter((issue) => dateInRange(issue.updatedAt, startMs, endMs));
  const backlog = issues.filter((issue) => {
    const createdTime = Date.parse(issue.createdAt);
    const resolvedTime = issue.resolvedAt ? Date.parse(issue.resolvedAt) : Number.POSITIVE_INFINITY;
    return createdTime < endMs && resolvedTime >= endMs;
  });
  const relevant = Array.from(new Map([...created, ...resolved, ...updated, ...backlog].map((issue) => [issue.key, issue])).values());
  const resolutionHours = resolved.map((issue) => issue.resolutionHours).filter((hours): hours is number => hours !== null);
  const missingWorkedTime = resolved.filter((issue) => issue.timeWorkedHours <= 0).length;
  const backlogWithoutEstimate = backlog.filter((issue) => !issue.targetDate && !issue.originalEstimateHours).length;
  const olderThan30Days = backlog.filter((issue) => (endMs - Date.parse(issue.createdAt)) / 86_400_000 > 30).length;
  const periodLabel = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
  const qualityWarnings: string[] = [];
  if (missingWorkedTime) qualityWarnings.push(`${missingWorkedTime} caso(s) resuelto(s) no tienen tiempo trabajado.`);
  if (backlogWithoutEstimate) qualityWarnings.push(`${backlogWithoutEstimate} caso(s) del backlog no tienen horas estimadas ni fecha objetivo.`);
  if (olderThan30Days) qualityWarnings.push(`${olderThan30Days} caso(s) del backlog tienen más de 30 días de antigüedad.`);

  return {
    period,
    periodLabel,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    projectKey: config.projectKey,
    metrics: {
      created: created.length,
      resolved: resolved.length,
      updated: updated.length,
      backlog: backlog.length,
      workedHours: Number(updated.reduce((sum, issue) => sum + issue.timeWorkedHours, 0).toFixed(2)),
      averageResolutionHours: resolutionHours.length
        ? Number((resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length).toFixed(2))
        : 0,
      medianResolutionHours: Number(median(resolutionHours).toFixed(2)),
      missingWorkedTime,
      backlogWithoutEstimate,
      olderThan30Days,
    },
    daily: buildDailyPoints(start, end, issues),
    issues: relevant,
    backlog,
    qualityWarnings,
  };
}
