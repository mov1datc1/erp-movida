import 'server-only';

import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secretEncryption';
import type {
  JiraFieldOption,
  JiraIssueSnapshot,
  JiraSubtaskSnapshot,
  JiraLexLatinConfigView,
  LexLatinDailyPoint,
  LexLatinReportData,
} from '@/types/jiraLexLatin';

export interface StoredJiraLexLatinConfig extends Omit<JiraLexLatinConfigView, 'tokenConfigured'> {
  apiTokenEncrypted: string;
}

type JiraFields = Record<string, unknown>;

const REPORT_TIME_ZONE = 'America/Mexico_City';
const LEGACY_APPROVER_EMAIL = 'edgar.jaen@movidatci.com';
const CURRENT_APPROVER_EMAIL = 'edgar.reyes@movidatci.com';

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

  const config = integration.config as unknown as StoredJiraLexLatinConfig;
  if (config.approverOperationsEmail?.trim().toLowerCase() !== LEGACY_APPROVER_EMAIL) {
    return config;
  }

  const corrected = {
    ...config,
    approverOperationsEmail: CURRENT_APPROVER_EMAIL,
    updatedAt: new Date().toISOString(),
  };
  await prisma.integracion.update({
    where: { proveedor: 'JIRA_LEXLATIN' },
    data: { config: JSON.parse(JSON.stringify(corrected)) },
  });
  console.info('[Jira LexLatin] Corrected legacy approver email', {
    from: LEGACY_APPROVER_EMAIL,
    to: CURRENT_APPROVER_EMAIL,
  });
  return corrected;
}

export function toJiraConfigView(config: StoredJiraLexLatinConfig | null): JiraLexLatinConfigView | null {
  if (!config) return null;
  const { apiTokenEncrypted, ...safe } = config;
  return {
    ...safe,
    timeWorkedFieldId: isSlaFieldConfigured(safe.timeWorkedFieldId) ? '' : safe.timeWorkedFieldId,
    impactFieldId: safe.impactFieldId || 'customfield_10004',
    tokenConfigured: Boolean(apiTokenEncrypted),
  };
}

function isSlaFieldConfigured(fieldId: string | undefined) {
  return fieldId === 'customfield_10031';
}

function effectiveTimeWorkedFieldId(config: StoredJiraLexLatinConfig) {
  return isSlaFieldConfigured(config.timeWorkedFieldId) ? '' : config.timeWorkedFieldId;
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
    suggestedImpactField: findSuggestedField(fields, ['impacto', 'impact']),
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
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1_000 ? value / 3_600 : value;
  if (typeof value !== 'string') return 0;
  const normalized = value.toLowerCase().replace(',', '.');
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return 0;
  if (normalized.includes('min')) return number / 60;
  if (normalized.includes('sec') || normalized.includes('seg') || number > 1_000) return number / 3_600;
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

function dateKeyInReportTimeZone(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function dateInPeriod(value: string | null, startDate: string, endDate: string) {
  if (!value) return false;
  const key = dateKeyInReportTimeZone(value);
  return Boolean(key && key >= startDate && key < endDate);
}

function normalizedText(value: string | null) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isCancelledOrDuplicate(issue: JiraIssueSnapshot) {
  const status = normalizedText(issue.status);
  const resolution = normalizedText(issue.resolution);
  return status.includes('cancel') || resolution.includes('duplic');
}

function mapSubtasks(
  config: StoredJiraLexLatinConfig,
  parentKey: string,
  parentSummary: string,
  fields: JiraFields,
): JiraSubtaskSnapshot[] {
  const subtasks: JiraSubtaskSnapshot[] = [];
  const seenKeys = new Set<string>();

  // 1. Native Jira Sub-tasks
  const rawSubtasks = Array.isArray(fields.subtasks) ? fields.subtasks : [];
  for (const item of rawSubtasks) {
    if (!item || typeof item !== 'object') continue;
    const stObj = item as Record<string, unknown>;
    const stFields = (stObj.fields || {}) as Record<string, unknown>;
    const stStatus = (stFields.status || {}) as Record<string, unknown>;
    const stKey = String(stObj.key || '');
    if (!stKey || seenKeys.has(stKey)) continue;
    seenKeys.add(stKey);

    subtasks.push({
      id: String(stObj.id || stKey),
      key: stKey,
      summary: String(stFields.summary || `Subtarea ${stKey}`),
      status: asNamedValue(stFields.status) || 'Sin estado',
      statusCategory: asNamedValue(stStatus.statusCategory) || '',
      issueType: asNamedValue(stFields.issuetype) || 'Subtarea',
      isSubtask: true,
      priority: asNamedValue(stFields.priority),
      assignee: asNamedValue(stFields.assignee),
      resolution: asNamedValue(stFields.resolution),
      parentKey,
      parentSummary,
      url: `${normalizeSiteUrl(config.siteUrl)}/browse/${stKey}`,
      originalEstimateHours: null,
      timeWorkedHours: 0,
    });
  }

  // 2. Linked issues / child tickets
  const links = Array.isArray(fields.issuelinks) ? fields.issuelinks : [];
  for (const link of links) {
    if (!link || typeof link !== 'object') continue;
    const item = link as Record<string, unknown>;
    const typeObj = (item.type || {}) as Record<string, unknown>;
    const outward = item.outwardIssue as Record<string, unknown> | undefined;
    const inward = item.inwardIssue as Record<string, unknown> | undefined;

    const candidates = [
      { cand: outward, role: 'outward' },
      { cand: inward, role: 'inward' },
    ];

    for (const { cand } of candidates) {
      if (!cand || typeof cand.key !== 'string') continue;
      const candKey = cand.key;
      if (seenKeys.has(candKey)) continue;
      seenKeys.add(candKey);

      const candFields = (cand.fields || {}) as Record<string, unknown>;
      const candStatus = (candFields.status || {}) as Record<string, unknown>;
      const candType = (candFields.issuetype || {}) as Record<string, unknown>;
      const isSub = Boolean(candType.subtask) ||
        String(typeObj.name || '').toLowerCase().includes('sub') ||
        String(typeObj.inward || '').toLowerCase().includes('parent') ||
        String(typeObj.outward || '').toLowerCase().includes('sub');

      subtasks.push({
        id: String(cand.id || candKey),
        key: candKey,
        summary: String(candFields.summary || `Subtarea vinculada ${candKey}`),
        status: asNamedValue(candFields.status) || 'Vinculada',
        statusCategory: asNamedValue(candStatus.statusCategory) || '',
        issueType: asNamedValue(candFields.issuetype) || (isSub ? 'Subtarea' : 'Incidencia vinculada'),
        isSubtask: isSub,
        priority: asNamedValue(candFields.priority),
        assignee: asNamedValue(candFields.assignee),
        resolution: asNamedValue(candFields.resolution),
        parentKey,
        parentSummary,
        url: `${normalizeSiteUrl(config.siteUrl)}/browse/${candKey}`,
        originalEstimateHours: null,
        timeWorkedHours: 0,
      });
    }
  }

  return subtasks;
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
  const timeWorkedFieldId = effectiveTimeWorkedFieldId(config);
  const customWorked = timeWorkedFieldId ? fields[timeWorkedFieldId] : undefined;
  const targetValue = config.targetDateFieldId ? fields[config.targetDateFieldId] : undefined;
  const impactValue = config.impactFieldId ? fields[config.impactFieldId] : undefined;
  const createdMs = Date.parse(createdAt);
  const resolvedMs = resolvedAt ? Date.parse(resolvedAt) : Number.NaN;

  const parentObj = fields.parent as Record<string, unknown> | undefined;
  const parentKey = typeof parentObj?.key === 'string' ? parentObj.key : null;
  const parentFields = parentObj?.fields as Record<string, unknown> | undefined;
  const parentSummary = typeof parentFields?.summary === 'string' ? parentFields.summary : null;
  const issuetypeObj = fields.issuetype as Record<string, unknown> | undefined;
  const isSubtask = Boolean(issuetypeObj?.subtask) || Boolean(parentKey);
  const summaryStr = String(fields.summary || '');
  const subtasks = mapSubtasks(config, issue.key, summaryStr, fields);

  return {
    id: issue.id,
    key: issue.key,
    summary: summaryStr,
    issueType: asNamedValue(fields.issuetype) || 'Solicitud',
    isSubtask,
    parentKey,
    parentSummary,
    subtasks,
    status: asNamedValue(fields.status) || 'Sin estado',
    statusCategory: asNamedValue(status.statusCategory) || String(statusCategory.key || ''),
    resolution: asNamedValue(fields.resolution),
    priority: asNamedValue(fields.priority),
    impact: asNamedValue(impactValue),
    assignee: asNamedValue(fields.assignee),
    reporter: asNamedValue(fields.reporter),
    createdAt,
    updatedAt: String(fields.updated || createdAt),
    resolvedAt,
    dueDate: parseDateValue(fields.duedate),
    targetDate: parseDateValue(targetValue) || parseDateValue(fields.duedate),
    timeWorkedHours: 0,
    timeWorkedCumulativeHours: customWorked === undefined || customWorked === null
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
      created: issues.filter((issue) => dateKeyInReportTimeZone(issue.createdAt) === key).length,
      resolved: issues.filter((issue) => issue.resolvedAt && dateKeyInReportTimeZone(issue.resolvedAt) === key).length,
    });
  }
  return points;
}

async function getIssueWorklogs(config: StoredJiraLexLatinConfig, issueKey: string) {
  const worklogs: Array<{ started?: string; timeSpentSeconds?: number }> = [];
  let startAt = 0;
  const maxResults = 100;
  let total = 0;

  do {
    const page = await jiraRequest<{
      startAt?: number;
      maxResults?: number;
      total?: number;
      worklogs?: Array<{ started?: string; timeSpentSeconds?: number }>;
    }>(config, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog?startAt=${startAt}&maxResults=${maxResults}`);
    worklogs.push(...(page.worklogs || []));
    total = page.total || worklogs.length;
    startAt += page.maxResults || maxResults;
  } while (worklogs.length < total);

  return worklogs;
}

async function addMonthlyWorklogHours(
  config: StoredJiraLexLatinConfig,
  issues: JiraIssueSnapshot[],
  startDate: string,
  endDate: string,
) {
  const enriched: JiraIssueSnapshot[] = [];
  const batchSize = 6;
  for (let index = 0; index < issues.length; index += batchSize) {
    const batch = issues.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (issue) => {
      const worklogs = await getIssueWorklogs(config, issue.key);
      const seconds = worklogs.reduce((sum, worklog) => {
        if (!worklog.started || !dateInPeriod(worklog.started, startDate, endDate)) return sum;
        return sum + (Number(worklog.timeSpentSeconds) || 0);
      }, 0);
      return { ...issue, timeWorkedHours: Number((seconds / 3600).toFixed(2)) };
    }));
    enriched.push(...results);
  }
  return enriched;
}

export async function buildLexLatinMonthlyReport(period: string): Promise<LexLatinReportData> {
  const config = await getStoredJiraLexLatinConfig();
  if (!config) throw new Error('Configura la integración Jira / LexLatin antes de sincronizar.');
  const { start, end } = monthRange(period);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const customFields = [effectiveTimeWorkedFieldId(config), config.targetDateFieldId, config.impactFieldId].filter(Boolean);
  const requestedFields = [
    'summary', 'issuetype', 'status', 'resolution', 'priority', 'assignee', 'reporter',
    'created', 'updated', 'resolutiondate', 'duedate', 'timetracking', 'timespent', 'issuelinks',
    'subtasks', 'parent',
    ...customFields,
  ];
  const jql = `project = ${config.projectKey} AND (created < "${endDate}" OR updated >= "${startDate}") ORDER BY created DESC`;
  const rawIssues = await searchAllIssues(config, jql, requestedFields);
  const issues = rawIssues
    .map((issue) => mapIssue(config, issue))
    .filter((issue) => !isCancelledOrDuplicate(issue));
  const createdBase = issues.filter((issue) => dateInPeriod(issue.createdAt, startDate, endDate));
  const resolvedBase = issues.filter((issue) => dateInPeriod(issue.resolvedAt, startDate, endDate));
  const updatedBase = issues.filter((issue) => dateInPeriod(issue.updatedAt, startDate, endDate));
  const backlogBase = issues.filter((issue) => {
    const createdKey = dateKeyInReportTimeZone(issue.createdAt);
    const resolvedKey = issue.resolvedAt ? dateKeyInReportTimeZone(issue.resolvedAt) : null;
    return Boolean(createdKey && createdKey < endDate && (!resolvedKey || resolvedKey >= endDate));
  });
  const relevantBase = Array.from(new Map([...createdBase, ...resolvedBase, ...updatedBase, ...backlogBase].map((issue) => [issue.key, issue])).values());
  const relevant = await addMonthlyWorklogHours(config, relevantBase, startDate, endDate);
  const relevantByKey = new Map(relevant.map((issue) => [issue.key, issue]));
  const created = createdBase.map((issue) => relevantByKey.get(issue.key) || issue);
  const resolved = resolvedBase.map((issue) => relevantByKey.get(issue.key) || issue);
  const updated = updatedBase.map((issue) => relevantByKey.get(issue.key) || issue);
  const backlog = backlogBase.map((issue) => relevantByKey.get(issue.key) || issue);
  const resolutionHours = resolved.map((issue) => issue.resolutionHours).filter((hours): hours is number => hours !== null);
  const missingWorkedTime = resolved.filter((issue) => issue.timeWorkedCumulativeHours <= 0).length;
  const backlogWithoutEstimate = backlog.filter((issue) => !issue.targetDate && !issue.originalEstimateHours).length;
  const endDayMs = Date.parse(`${endDate}T00:00:00Z`);
  const olderThan30Days = backlog.filter((issue) => {
    const createdKey = dateKeyInReportTimeZone(issue.createdAt);
    return createdKey ? (endDayMs - Date.parse(`${createdKey}T00:00:00Z`)) / 86_400_000 > 30 : false;
  }).length;
  const periodLabel = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
  const qualityWarnings: string[] = [];
  if (missingWorkedTime) qualityWarnings.push(`${missingWorkedTime} caso(s) resuelto(s) no tienen tiempo trabajado.`);
  if (backlogWithoutEstimate) qualityWarnings.push(`${backlogWithoutEstimate} caso(s) del backlog no tienen horas estimadas ni fecha objetivo.`);
  if (olderThan30Days) qualityWarnings.push(`${olderThan30Days} caso(s) del backlog tienen más de 30 días de antigüedad.`);

  const workedHours = Number(relevant.reduce((sum, issue) => sum + issue.timeWorkedHours, 0).toFixed(2));
  const ticketsWithWorkedHours = relevant.filter((issue) => issue.timeWorkedHours > 0).length;

  return enrichReportWithSubtasks({
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
      workedHours,
      workedHoursCumulative: Number(relevant.reduce((sum, issue) => sum + issue.timeWorkedCumulativeHours, 0).toFixed(2)),
      ticketsWithWorkedHours,
      averageWorkedHoursPerTicket: ticketsWithWorkedHours
        ? Number((workedHours / ticketsWithWorkedHours).toFixed(2))
        : 0,
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
  });
}

export function enrichReportWithSubtasks(report: LexLatinReportData): LexLatinReportData {
  if (!report) return report;
  const issuesByKey = new Map<string, JiraIssueSnapshot>();
  for (const issue of report.issues || []) {
    issuesByKey.set(issue.key, issue);
  }

  const enrichedIssues = (report.issues || []).map((issue) => {
    const existingSubtasks = Array.isArray(issue.subtasks) ? [...issue.subtasks] : [];
    const subtaskKeys = new Set(existingSubtasks.map((st) => st.key));

    const linkedKeys = Array.isArray(issue.linkedIssueKeys) ? issue.linkedIssueKeys : [];
    for (const linkedKey of linkedKeys) {
      if (subtaskKeys.has(linkedKey)) continue;
      const linkedIssue = issuesByKey.get(linkedKey);
      if (linkedIssue) {
        existingSubtasks.push({
          id: linkedIssue.id,
          key: linkedIssue.key,
          summary: linkedIssue.summary,
          status: linkedIssue.status,
          statusCategory: linkedIssue.statusCategory,
          issueType: linkedIssue.issueType,
          isSubtask: true,
          priority: linkedIssue.priority,
          assignee: linkedIssue.assignee,
          resolution: linkedIssue.resolution,
          parentKey: issue.key,
          parentSummary: issue.summary,
          url: linkedIssue.url,
          originalEstimateHours: linkedIssue.originalEstimateHours,
          timeWorkedHours: linkedIssue.timeWorkedHours,
        });
        subtaskKeys.add(linkedKey);
      } else {
        existingSubtasks.push({
          id: linkedKey,
          key: linkedKey,
          summary: `Subtarea / Incidencia vinculada ${linkedKey}`,
          status: 'Vinculada',
          statusCategory: '',
          issueType: 'Subtarea',
          isSubtask: true,
          priority: null,
          assignee: null,
          parentKey: issue.key,
          parentSummary: issue.summary,
          url: issue.url ? issue.url.replace(issue.key, linkedKey) : `https://lexlatin.atlassian.net/browse/${linkedKey}`,
          originalEstimateHours: null,
          timeWorkedHours: 0,
        });
        subtaskKeys.add(linkedKey);
      }
    }

    return {
      ...issue,
      subtasks: existingSubtasks,
    };
  });

  const allSubtasks = enrichedIssues.flatMap((issue) => issue.subtasks || []);
  const uniqueSubtasksByKey = new Map<string, JiraSubtaskSnapshot>();
  for (const st of allSubtasks) {
    if (!uniqueSubtasksByKey.has(st.key)) {
      uniqueSubtasksByKey.set(st.key, st);
    }
  }
  const totalSubtasks = uniqueSubtasksByKey.size;
  const ticketsWithSubtasks = enrichedIssues.filter((issue) => (issue.subtasks || []).length > 0).length;
  const resolvedSubtasks = Array.from(uniqueSubtasksByKey.values()).filter((st) => {
    const s = normalizedText(st.status);
    return s.includes('listo') || s.includes('resuelt') || s.includes('done') || s.includes('cerrad');
  }).length;
  const openSubtasks = Math.max(0, totalSubtasks - resolvedSubtasks);
  const maxSubtasksPerTicket = enrichedIssues.reduce((max, issue) => Math.max(max, (issue.subtasks || []).length), 0);

  const enrichedBacklog = (report.backlog || []).map((issue) => {
    const found = enrichedIssues.find((i) => i.key === issue.key);
    return found || issue;
  });

  return {
    ...report,
    issues: enrichedIssues,
    backlog: enrichedBacklog,
    metrics: {
      ...report.metrics,
      totalSubtasks,
      ticketsWithSubtasks,
      resolvedSubtasks,
      openSubtasks,
      maxSubtasksPerTicket,
    },
  };
}
