export type LexLatinAgentRequestStatus = 'SENT' | 'RESPONDED' | 'CLOSED' | 'ERROR';

export interface LexLatinAgentRequestView {
  id: string;
  folio: string;
  period: string;
  status: LexLatinAgentRequestStatus;
  mode: 'TEST' | 'LIVE';
  recipient: string;
  subject: string;
  sentAt: string;
  messageId?: string;
  responseAt?: string;
  responseFrom?: string;
  responseText?: string;
  issueKeys: string[];
  warnings: string[];
  error?: string;
}

