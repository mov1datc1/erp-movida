import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Authentication
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch pending reminders for today
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));

    const recordatoriosPendientes = await prisma.recordatorio.findMany({
      where: {
        estatus: "PENDIENTE",
        fecha_recordatorio: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        tareas_asociadas: {
          include: {
            tarea: true,
          },
        },
        usuario: true, // If we want to notify the creator
      },
    });

    if (recordatoriosPendientes.length === 0) {
      return NextResponse.json({ message: "No hay recordatorios pendientes para hoy." });
    }

    // 3. Process each reminder
    for (const rec of recordatoriosPendientes) {
      // Find who to notify (fallback to a default admin email if none)
      const emailTo = rec.usuario?.email || process.env.ADMIN_EMAIL || "admin@movidatci.com";
      
      const tareasHtml = rec.tareas_asociadas.length > 0 
        ? `<ul>${rec.tareas_asociadas.map(ta => `<li>${ta.tarea.titulo} (${ta.tarea.estatus})</li>`).join("")}</ul>`
        : "<p><em>No hay tareas asociadas.</em></p>";

      const htmlBody = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🔔 Recordatorio Automático</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 16px; line-height: 1.5;">Hola,</p>
            <p style="font-size: 16px; line-height: 1.5;">Este es tu recordatorio programado para hoy: <strong>${format(new Date(rec.fecha_recordatorio), "dd MMM yyyy, HH:mm", { locale: es })}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
              <p style="margin: 0; font-size: 16px;"><strong>Descripción:</strong><br/> ${rec.descripcion}</p>
            </div>

            <h3 style="margin-top: 24px; color: #1e293b;">Tareas Asociadas:</h3>
            ${tareasHtml}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 14px; color: #64748b; text-align: center;">
              Enviado automáticamente por el sistema ERP Movida TCI.
            </p>
          </div>
        </div>
      `;

      // 4. Send Email via Resend
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "ERP Movida <onboarding@resend.dev>", // Should be a verified domain in production
          to: emailTo,
          subject: "🔔 Tienes un nuevo Recordatorio - ERP Movida",
          html: htmlBody,
        });
      } else {
        console.log("No RESEND_API_KEY found. Simulating email send:", { emailTo, subject: rec.descripcion });
      }

      // 5. Update Status
      await prisma.recordatorio.update({
        where: { id: rec.id },
        data: { estatus: "ENVIADO" },
      });
    }

    return NextResponse.json({ 
      success: true, 
      processed: recordatoriosPendientes.length 
    });

  } catch (error) {
    console.error("Error procesando cron de recordatorios:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
