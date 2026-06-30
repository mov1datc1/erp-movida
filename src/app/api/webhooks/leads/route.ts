import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// =============================================
// PUBLIC WEBHOOK: Lead Ingestion Endpoint
// POST /api/webhooks/leads
// =============================================
// Accepts leads from:
//   - Meta Ads (via Make/Zapier or direct webhook)
//   - WordPress landing pages (Contact Form to API plugin)
//   - Google Ads (via WordPress or Make)
//   - Any external system that can POST JSON
//
// Auth: Bearer token via WEBHOOK_SECRET env var
// Dedup: If email already exists, updates the existing client
// =============================================

export async function POST(req: Request) {
  try {
    // 1. Validate API Key
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.WEBHOOK_SECRET;

    if (!expectedToken) {
      console.error('[Webhook Leads] WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing API key.' },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json();
    const { nombre, email, telefono, empresa, fuente, notas } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El campo "nombre" es obligatorio.' },
        { status: 400 }
      );
    }

    // 3. Deduplication: check if email already exists
    let cliente;
    if (email) {
      const existing = await prisma.cliente.findFirst({
        where: { email: email.toLowerCase().trim() }
      });

      if (existing) {
        // Update existing client with new info (don't overwrite non-null fields with null)
        cliente = await prisma.cliente.update({
          where: { id: existing.id },
          data: {
            nombre: nombre || existing.nombre,
            telefono: telefono || existing.telefono,
            empresa: empresa || existing.empresa,
            fuente: fuente || existing.fuente,
            notas: notas
              ? existing.notas
                ? `${existing.notas}\n---\n${notas}`
                : notas
              : existing.notas,
          }
        });

        return NextResponse.json(
          {
            success: true,
            action: 'updated',
            id: cliente.id,
            message: `Lead existente actualizado: ${cliente.nombre}`
          },
          { status: 200 }
        );
      }
    }

    // 4. Create new lead
    cliente = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        email: email ? email.toLowerCase().trim() : null,
        telefono: telefono || null,
        empresa: empresa || null,
        fuente: fuente || 'Desconocido',
        notas: notas || null,
        estatus: 'LEAD',
      }
    });

    return NextResponse.json(
      {
        success: true,
        action: 'created',
        id: cliente.id,
        message: `Nuevo lead creado: ${cliente.nombre}`
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[Webhook Leads] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (Meta requires this)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Meta Webhook Verification
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WEBHOOK_SECRET) {
    console.log('[Webhook Leads] Meta verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  // Health check
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/leads',
    method: 'POST',
    auth: 'Bearer token required (WEBHOOK_SECRET)',
    fields: {
      required: ['nombre'],
      optional: ['email', 'telefono', 'empresa', 'fuente', 'notas']
    }
  });
}
