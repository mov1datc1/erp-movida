export type EmailAccountPurpose =
  | 'FACTURACION'
  | 'CONCILIACION'
  | 'NOTIFICACIONES'
  | 'AGENTES'
  | 'GENERAL';

export interface EmailAccountView {
  id: string;
  nombre: string;
  proposito: EmailAccountPurpose;
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
  tienePassword: boolean;
  updatedAt?: string;
}

export interface EmailAccountInput extends Omit<EmailAccountView, 'tienePassword' | 'updatedAt'> {
  password?: string;
}
