export interface JiraLexLatinConfigInput {
  activa: boolean;
  siteUrl: string;
  accountEmail: string;
  apiToken?: string;
  projectKey: string;
  timeWorkedFieldId: string;
  targetDateFieldId: string;
  approverOperationsEmail: string;
  approverDeliveryEmail: string;
  recipientTo: string;
  recipientCc: string;
  cutoffStartDay: number;
  cutoffEndDay: number;
}

export interface JiraLexLatinConfigView extends Omit<JiraLexLatinConfigInput, 'apiToken'> {
  tokenConfigured: boolean;
  tokenLast4?: string;
  updatedAt?: string;
}

export interface JiraFieldOption {
  id: string;
  name: string;
  schemaType?: string;
}

export interface JiraIssueSnapshot {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  statusCategory: string;
  resolution: string | null;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  dueDate: string | null;
  targetDate: string | null;
  timeWorkedHours: number;
  originalEstimateHours: number | null;
  resolutionHours: number | null;
  linkedIssueKeys: string[];
  url: string;
}

export interface LexLatinReportMetrics {
  created: number;
  resolved: number;
  updated: number;
  backlog: number;
  workedHours: number;
  averageResolutionHours: number;
  medianResolutionHours: number;
  missingWorkedTime: number;
  backlogWithoutEstimate: number;
  olderThan30Days: number;
}

export interface LexLatinDailyPoint {
  date: string;
  label: string;
  created: number;
  resolved: number;
}

export interface LexLatinReportData {
  period: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  projectKey: string;
  metrics: LexLatinReportMetrics;
  daily: LexLatinDailyPoint[];
  issues: JiraIssueSnapshot[];
  backlog: JiraIssueSnapshot[];
  qualityWarnings: string[];
}
