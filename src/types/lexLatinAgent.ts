export type LexLatinAgentRequestStatus = 'SENT' | 'RESPONDED' | 'CLOSED' | 'ERROR';

export interface LexLatinAgentRequestView {
  id: string;
  folio: string;
  period: string;
  status: LexLatinAgentRequestStatus;
  mode: 'TEST' | 'LIVE';
  recipient: string;
  sender?: string;
  subject: string;
  sentAt: string;
  messageId?: string;
  smtpAccepted?: string[];
  smtpRejected?: string[];
  smtpPending?: string[];
  smtpResponse?: string;
  responseAt?: string;
  responseFrom?: string;
  responseText?: string;
  issueKeys: string[];
  warnings: string[];
  error?: string;
}
