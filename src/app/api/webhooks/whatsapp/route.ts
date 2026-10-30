import { NextRequest, NextResponse } from 'next/server';
import {
  analizarComprobanteConVision,
  registrarComprobantesExtraidos,
} from '@/lib/gastosAgent';

export const dynamic = 'force-dynamic';

/**
 * Verificación del Webhook de Meta / WhatsApp Business API
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'movida_wh_token_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WHATSAPP WEBHOOK] Verificación exitosa por Meta.');
    return new NextResponse(challenge || 'OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WHATSAPP WEBHOOK] Intento de verificación no autorizado:', { mode, token });
  return NextResponse.json({ error: 'Token de verificación inválido' }, { status: 403 });
}

/**
 * Recepción de eventos y mensajes entrantes de WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificación estructural rápida
    if (!body?.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const token = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val || !val.messages || !Array.isArray(val.messages)) continue;

        const contact = val.contacts?.[0];
        const remitenteNombre = contact?.profile?.name || 'Usuario WhatsApp';
        const remitenteNumero = contact?.wa_id;

        for (const msg of val.messages) {
          const caption = msg.image?.caption || msg.text?.body || '';

          // 1. Mensaje de imagen (comprobante)
          if (msg.type === 'image' && msg.image?.id) {
            console.log(`[WHATSAPP WEBHOOK] Imagen recibida de ${remitenteNombre} (${remitenteNumero}):`, msg.image.id);

            if (!token) {
              console.warn('[WHATSAPP WEBHOOK] WHATSAPP_API_TOKEN no configurado en entorno. Se requiere para descargar media.');
              continue;
            }

            try {
              // Obtener URL de descarga del media en Meta Graph API
              const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${msg.image.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const mediaData = await mediaRes.json();

              if (mediaData?.url) {
                // Descargar bytes de la imagen
                const imgRes = await fetch(mediaData.url, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const arrayBuf = await imgRes.arrayBuffer();
                const base64 = Buffer.from(arrayBuf).toString('base64');
                const mimeType = msg.image.mime_type || 'image/jpeg';

                // Analizar con GPT-4o-mini Vision
                const extracciones = await analizarComprobanteConVision({
                  imageBase64: base64,
                  mimeType,
                  notaContexto: caption,
                  remitente: `${remitenteNombre} (${remitenteNumero})`,
                  chatNombre: 'WhatsApp Cloud API Buzón',
                });

                if (extracciones && extracciones.length > 0) {
                  await registrarComprobantesExtraidos({
                    extracciones,
                    imagenUrl: `data:${mimeType};base64,${base64}`,
                    remitente: remitenteNombre,
                    chatNombre: 'WhatsApp Buzón Movida',
                  });
                  console.log(`[WHATSAPP WEBHOOK] ${extracciones.length} comprobante(s) procesado(s) y guardado(s).`);
                }
              }
            } catch (mediaErr) {
              console.error('[WHATSAPP WEBHOOK] Error procesando imagen recibida:', mediaErr);
            }
          }
        }
      }
    }

    // Siempre retornar 200 OK a Meta para confirmar recepción
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('[WHATSAPP WEBHOOK] Error en webhook handler:', error);
    // Respondemos 200 para evitar que Meta deshabilite el webhook por reintentos fallidos
    return NextResponse.json({ status: 'error_handled', error: error.message }, { status: 200 });
  }
}

