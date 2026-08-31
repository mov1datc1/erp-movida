import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { TareaStatus } from '@prisma/client';

export interface TaskStatusNotificationParams {
  taskTitle: string;
  oldStatus: TareaStatus | string;
  newStatus: TareaStatus | string;
  proyectoNombre: string;
  sprintNumero?: number | null;
  sprintNombre?: string | null;
  usuarioNombre?: string | null;
}

const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: '#f1f5f9', text: '#475569' },
  EN_CURSO: { label: 'En Curso', bg: '#e0e7ff', text: '#3730a3' },
  ON_HOLD: { label: 'On Hold', bg: '#f3e8ff', text: '#6b21a8' },
  COMPLETADA: { label: 'Completada', bg: '#d1fae5', text: '#065f46' },
  CANCELADA: { label: 'Cancelada', bg: '#fee2e2', text: '#991b1b' },
};

/**
 * Retrieves the active SMTP configuration from Database (Integracion)
 * or falls back to process.env and default credentials provided by user.
 */
export async function getSMTPConfig() {
  const defaultHost = process.env.SMTP_HOST || 'mail.movidatci.com';
  const defaultPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const defaultUser = process.env.SMTP_USER || 'info@movidatci.com';
  const defaultPass = process.env.SMTP_PASS || 'DragonDorado2024-';
  const defaultRecipients = process.env.SMTP_NOTIFY_EMAILS || 'info@movidatci.com';

  try {
    const dbIntegration = await prisma.integracion.findUnique({
      where: { proveedor: 'SMTP_CORREO' },
    });

    if (dbIntegration && dbIntegration.config) {
      const cfg = dbIntegration.config as any;
      return {
        host: cfg.host || defaultHost,
        port: parseInt(cfg.port || `${defaultPort}`, 10),
        user: cfg.user || defaultUser,
        pass: cfg.pass || defaultPass,
        recipients: cfg.recipients || cfg.destinatarios || defaultRecipients,
        activa: dbIntegration.activa !== false,
      };
    }
  } catch (error) {
    console.error('Error fetching SMTP config from DB, using fallback defaults:', error);
  }

  return {
    host: defaultHost,
    port: defaultPort,
    user: defaultUser,
    pass: defaultPass,
    recipients: defaultRecipients,
    activa: true,
  };
}

/**
 * Creates nodemailer transporter from configuration
 */
export async function getMailTransporter() {
  const config = await getSMTPConfig();
  const isSecure = config.port === 465;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: isSecure, // true for port 465, false for 587/25
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues
    },
  });

  return { transporter, config };
}

/**
 * Sends notification email when a card status changes
 */
export async function sendTaskStatusNotification(params: TaskStatusNotificationParams) {
  try {
    const { transporter, config } = await getMailTransporter();

    if (!config.activa) {
      console.log('SMTP notification skipped: integration is disabled.');
      return { success: false, reason: 'Integration disabled' };
    }

    const recipientsList = config.recipients
      .split(/[,;\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientsList.length === 0) {
      console.log('SMTP notification skipped: no recipients configured.');
      return { success: false, reason: 'No recipients configured' };
    }

    const oldBadge = statusLabels[params.oldStatus] || { label: params.oldStatus, bg: '#f1f5f9', text: '#334155' };
    const newBadge = statusLabels[params.newStatus] || { label: params.newStatus, bg: '#e0e7ff', text: '#3730a3' };
    const sprintText = params.sprintNumero ? `Sprint #${params.sprintNumero}${params.sprintNombre ? ` - ${params.sprintNombre}` : ''}` : 'Sin Sprint';

    const fechaHoraStr = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `[Movida ERP] Movimiento de Tarjeta: "${params.taskTitle}" ➔ ${newBadge.label}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Movimiento de Tarjeta</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-family: monospace;">
                      Movida ERP — Alerta Kanban
                    </span>
                    <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                      Movimiento de Tarjeta en Proyecto
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Proyecto</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      ${params.proyectoNombre}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Sprint</span>
                    <div style="font-size: 14px; font-weight: 700; color: #475569; margin-top: 2px;">
                      ${sprintText}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nombre de la Tarjeta</span>
                    <div style="font-size: 15px; font-weight: 800; color: #4338ca; margin-top: 2px;">
                      ${params.taskTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 16px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                      Movimiento Realizado
                    </span>
                    <div style="font-size: 14px; font-weight: 700; display: inline-block;">
                      <span style="background-color: ${oldBadge.bg}; color: ${oldBadge.text}; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">
                        ${oldBadge.label}
                      </span>
                      <span style="margin: 0 8px; color: #94a3b8; font-size: 16px;">➔</span>
                      <span style="background-color: ${newBadge.bg}; color: ${newBadge.text}; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800;">
                        ${newBadge.label}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
                <strong>Fecha del movimiento:</strong> ${fechaHoraStr}
              </p>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app'}/proyectos" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                  Ver Tablero Kanban en Movida ERP
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              Notificación automática generada por <strong>Movida ERP</strong> — Movida TCI LLC<br>
              Este correo fue enviado a la lista de notificación configurada en el sistema.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"Movida ERP Notificaciones" <${config.user}>`,
      to: recipientsList,
      subject,
      html: htmlBody,
    });

    console.log(`[SMTP] Task notification sent to ${recipientsList.join(', ')}. MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[SMTP] Error sending task status notification:', error);
    return { success: false, error: error.message || 'Error sending email' };
  }
}

export interface SubtaskNotificationParams {
  taskTitle: string;
  subtareaTexto: string;
  subtareaCompletada: boolean;
  totalSubtareas: number;
  completadasSubtareas: number;
  proyectoNombre: string;
  sprintNumero?: number | null;
  sprintNombre?: string | null;
  allSubtareas?: Array<{ texto: string; completada: boolean }>;
}

/**
 * Sends notification email when a subtask checklist item is toggled
 */
export async function sendSubtaskUpdateNotification(params: SubtaskNotificationParams) {
  try {
    const { transporter, config } = await getMailTransporter();

    if (!config.activa) {
      return { success: false, reason: 'Integration disabled' };
    }

    const recipientsList = config.recipients
      .split(/[,;\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientsList.length === 0) {
      return { success: false, reason: 'No recipients configured' };
    }

    const sprintText = params.sprintNumero ? `Sprint #${params.sprintNumero}${params.sprintNombre ? ` - ${params.sprintNombre}` : ''}` : 'Sin Sprint';
    const statusText = params.subtareaCompletada ? 'COMPLETADA ✅' : 'PENDIENTE ☐';
    const porcentaje = params.totalSubtareas > 0 ? Math.round((params.completadasSubtareas / params.totalSubtareas) * 100) : 0;

    const fechaHoraStr = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `[Movida ERP] Checklist Actualizado: "${params.taskTitle}" (${params.completadasSubtareas}/${params.totalSubtareas})`;

    const subtareasRows = (params.allSubtareas || [])
      .map(
        sub => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-size: 13px; color: ${sub.completada ? '#059669' : '#334155'}; font-weight: ${sub.completada ? '700' : '500'};">
            ${sub.completada ? '☑' : '☐'} ${sub.texto}
          </td>
          <td style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-align: right; color: ${sub.completada ? '#059669' : '#64748b'};">
            ${sub.completada ? 'Completado' : 'Pendiente'}
          </td>
        </tr>`
      )
      .join('');

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Actualización de Checklist</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-family: monospace;">
                Movida ERP — Avance de Entregables
              </span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Actualización de Checklist de Subtareas
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Proyecto</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                      ${params.proyectoNombre}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Sprint</span>
                    <div style="font-size: 14px; font-weight: 700; color: #475569; margin-top: 2px;">
                      ${sprintText}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tarjeta</span>
                    <div style="font-size: 15px; font-weight: 800; color: #059669; margin-top: 2px;">
                      ${params.taskTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Actividad Modificada</span>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                      "${params.subtareaTexto}" ➔ <span style="color: ${params.subtareaCompletada ? '#059669' : '#dc2626'}; font-weight: 800;">${statusText}</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 16px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">
                      Progreso General del Checklist (${params.completadasSubtareas}/${params.totalSubtareas} - ${porcentaje}%)
                    </span>
                    <div style="background-color: #e2e8f0; height: 10px; border-radius: 10px; overflow: hidden;">
                      <div style="background-color: #059669; width: ${porcentaje}%; height: 100%; border-radius: 10px;"></div>
                    </div>
                  </td>
                </tr>
              </table>

              ${subtareasRows ? `
              <div style="margin-bottom: 24px;">
                <span style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 12px;">
                  Detalle de Actividades del Checklist:
                </span>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                  ${subtareasRows}
                </table>
              </div>
              ` : ''}

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b;">
                <strong>Fecha del cambio:</strong> ${fechaHoraStr}
              </p>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://erp-movida.vercel.app'}/proyectos" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                  Ver Tarjeta en Movida ERP
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              Notificación automática generada por <strong>Movida ERP</strong> — Movida TCI LLC
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"Movida ERP Notificaciones" <${config.user}>`,
      to: recipientsList,
      subject,
      html: htmlBody,
    });

    console.log(`[SMTP] Subtask update notification sent to ${recipientsList.join(', ')}.`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[SMTP] Error sending subtask notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a test email to verify SMTP configuration
 */
export async function sendTestEmail(targetEmail?: string) {
  try {
    const { transporter, config } = await getMailTransporter();
    const recipient = targetEmail || config.recipients.split(/[,;\n]/)[0] || config.user;

    const info = await transporter.sendMail({
      from: `"Movida ERP" <${config.user}>`,
      to: recipient,
      subject: '[Movida ERP] Prueba de Conexión SMTP Exitosa',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 16px;">
          <h2 style="color: #4f46e5;">¡Conexión SMTP Configurada Correctamente! 🎉</h2>
          <p style="color: #334155; font-size: 14px;">
            El servidor SMTP <strong>${config.host}:${config.port}</strong> mediante el correo <strong>${config.user}</strong> está funcionando correctamente.
          </p>
          <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
            Enviado desde Movida ERP para confirmar las notificaciones Kanban.
          </p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId, recipient };
  } catch (error: any) {
    console.error('[SMTP] Test email failed:', error);
    return { success: false, error: error.message };
  }
}
