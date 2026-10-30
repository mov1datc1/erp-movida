import { prisma } from '@/lib/prisma';
import { getOpenAIClient } from '@/lib/openaiClient';
import {
  ComprobanteGastoView,
  ExtraccionComprobante,
  GastosBuzonStore,
} from '@/types/gastosAgent';

const INTEGRACION_PROVEEDOR = 'GASTOS_WHATSAPP_BUZON';

// Comprobantes semilla del chat real de WhatsApp "Gastos & Fi Movida"
const SEED_COMPROBANTES: ComprobanteGastoView[] = [
  {
    id: 'gst-202610-zel1500',
    folio: 'GST-202610-001',
    tipo: 'EGRESO',
    monto: 1500.0,
    moneda: 'USD',
    monto_usd: 1500.0,
    fecha: '2026-10-30',
    hora: '12:35 p.m.',
    destinatario: 'Jonathan Palacios',
    titular_enrolado: 'JONATHAN PALACIOS PINANGO',
    pagador: 'Ricardo Zerpa',
    medio_pago: 'Zelle',
    banco: 'Wells Fargo',
    referencia: 'WFCT22TF7DS8',
    nota_whatsapp: 'Pago Joel..',
    remitente_chat: 'Ricardo Zerpa Cdmx',
    chat_origen: 'Gastos & Fi Movida',
    resumen_ejecutivo: 'Transferencia Zelle de $1,500.00 USD enviada a Jonathan Palacios Pinango. Ref: WFCT22TF7DS8. Nota: Pago Joel..',
    estado: 'PENDIENTE',
    confianza: 0.98,
    proveedor_nombre: 'Jonathan Palacios / Joel',
    proyecto_nombre: 'Movida Interno / Desarrollo',
    creadoEn: '2026-10-30T12:35:00.000Z',
  },
  {
    id: 'gst-202610-zel2000',
    folio: 'GST-202610-002',
    tipo: 'EGRESO',
    monto: 2000.0,
    moneda: 'USD',
    monto_usd: 2000.0,
    fecha: '2026-10-30',
    hora: '12:35 p.m.',
    destinatario: 'Delbert Cedeno',
    titular_enrolado: 'DELBERT CEDENO ROMERO',
    pagador: 'Ricardo Zerpa Cdmx',
    medio_pago: 'Zelle',
    banco: 'Zelle',
    referencia: 'ZEL-DELBERT-2000',
    nota_whatsapp: 'Pago a Dep...',
    remitente_chat: 'Ricardo Zerpa Cdmx',
    chat_origen: 'Gastos & Fi Movida',
    resumen_ejecutivo: 'Transferencia Zelle de $2,000.00 USD enviada a Delbert Cedeno Romero por Ricardo Zerpa. Nota: Pago a Deproinf.',
    estado: 'PENDIENTE',
    confianza: 0.96,
    proveedor_nombre: 'Delbert Cedeño',
    proyecto_nombre: 'Deproinf Movida Project',
    creadoEn: '2026-10-30T12:35:00.000Z',
  },
];

/**
 * Obtiene el almacén de comprobantes y configuración del buzón
 */
export async function getGastosStore(): Promise<GastosBuzonStore> {
  const row = await prisma.integracion.findUnique({
    where: { proveedor: INTEGRACION_PROVEEDOR },
  });

  if (!row?.config || typeof row.config !== 'object' || Array.isArray(row.config)) {
    // Inicializar con comprobantes semilla si no existe
    const initialStore: GastosBuzonStore = {
      comprobantes: SEED_COMPROBANTES,
      webhookConfig: {
        verifyToken: 'movida_wh_token_2026',
        activo: true,
      },
    };

    try {
      await prisma.integracion.upsert({
        where: { proveedor: INTEGRACION_PROVEEDOR },
        create: {
          proveedor: INTEGRACION_PROVEEDOR,
          config: initialStore as any,
          activa: true,
        },
        update: {},
      });
    } catch {
      // Si ocurre colisión en concurrencia
    }

    return initialStore;
  }

  const store = row.config as unknown as GastosBuzonStore;
  if (!store.comprobantes || !Array.isArray(store.comprobantes)) {
    store.comprobantes = SEED_COMPROBANTES;
  }
  return store;
}

/**
 * Persiste el almacén completo
 */
export async function saveGastosStore(store: GastosBuzonStore): Promise<void> {
  await prisma.integracion.upsert({
    where: { proveedor: INTEGRACION_PROVEEDOR },
    create: {
      proveedor: INTEGRACION_PROVEEDOR,
      config: store as any,
      activa: true,
    },
    update: {
      config: store as any,
      activa: true,
    },
  });
}

/**
 * Prompt de visión multimodal para extraer datos de comprobantes financieros
 */
const SYSTEM_PROMPT_VISION = `Eres el Agente Experto de Finanzas, Gastos y Conciliación Bancaria de Movida TCI (A20).
Tu tarea es examinar imágenes de comprobantes bancarios, capturas de pantalla de chats de WhatsApp (como transferencias Zelle, SPEI, BBVA, Wells Fargo, Bank of America, Binance/USDT, cheques o depósitos), o fotos de facturas y notas de gasto.

INSTRUCCIONES CLAVE:
1. Si en la imagen se observa un chat de WhatsApp con uno o más comprobantes de pago consecutivos (por ejemplo, Zelle de $1,500 y Zelle de $2,000 en la misma conversación), extrae un elemento individual para CADA comprobante detectado.
2. Extrae con precisión milimétrica los siguientes campos:
   - "tipo": "EGRESO" si es dinero enviado/gastado, o "INGRESO" si es cobro/pago recibido.
   - "monto": número limpio flotante (ej: 1500, 2000.50).
   - "moneda": "USD", "MXN", "EUR", "USDT", etc.
   - "fecha": formato YYYY-MM-DD. Si no tiene año explícito y dice hoy/octubre, asume 2026-10-30 o la fecha indicada.
   - "hora": hora legible (ej. "12:35 p.m.").
   - "destinatario": a quién se le pagó (ej. "Jonathan Palacios").
   - "titular_enrolado": nombre formal o enrolamiento (ej. "JONATHAN PALACIOS PINANGO").
   - "pagador_o_remitente": quien ejecutó o mandó el pago (ej. "Ricardo Zerpa", "Ricardo Zerpa Cdmx").
   - "medio_pago": "Zelle", "SPEI", "Transferencia ACH", "Binance Pay", "Efectivo", etc.
   - "banco": banco emisor o plataforma (Wells Fargo, BofA, Banorte, BBVA, etc.).
   - "referencia": folio de confirmación (ej. "WFCT22TF7DS8"). Si no se ve claramente, genera una referencia representativa con el medio y fecha.
   - "nota_whatsapp": texto o mensaje que acompaña la captura en el chat (ej. "Pago Joel..", "Pago a Dep...").
   - "resumen_ejecutivo": una frase ejecutiva en español sintetizando el movimiento.
   - "proveedor_sugerido": nombre sugerido para vincular en el catálogo de proveedores.
   - "proyecto_sugerido": deduce el proyecto por la nota y el destinatario (ej. "Deproinf", "Joel / Aztama", "Movida Interno").
   - "categoria_sugerida": ej. "Desarrollo y Programación", "Infraestructura Cloud", "Operativo", "Nómina".
   - "confianza": de 0.0 a 1.0 según la claridad visual del comprobante.

DEBES RESPONDER EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA:
{
  "comprobantes": [
    {
      "tipo": "EGRESO",
      "monto": 1500,
      "moneda": "USD",
      "fecha": "2026-10-30",
      "hora": "12:35 p.m.",
      "destinatario": "Jonathan Palacios",
      "titular_enrolado": "JONATHAN PALACIOS PINANGO",
      "pagador_o_remitente": "Ricardo Zerpa",
      "medio_pago": "Zelle",
      "banco": "Wells Fargo",
      "referencia": "WFCT22TF7DS8",
      "nota_whatsapp": "Pago Joel..",
      "resumen_ejecutivo": "Transferencia Zelle de $1,500 USD a Jonathan Palacios. Ref: WFCT22TF7DS8",
      "proveedor_sugerido": "Jonathan Palacios",
      "proyecto_sugerido": "Movida Interno",
      "categoria_sugerida": "Desarrollo",
      "confianza": 0.95
    }
  ]
}`;

/**
 * Analiza una imagen en base64 con OpenAI GPT-4o-mini Vision
 */
export async function analizarComprobanteConVision(params: {
  imageBase64: string;
  mimeType?: string;
  notaContexto?: string;
  remitente?: string;
  chatNombre?: string;
}): Promise<ExtraccionComprobante[]> {
  const { client } = await getOpenAIClient();

  const mime = params.mimeType || 'image/jpeg';
  const dataUrl = params.imageBase64.startsWith('data:')
    ? params.imageBase64
    : `data:${mime};base64,${params.imageBase64}`;

  let userPrompt = 'Por favor analiza este comprobante o captura de WhatsApp y extrae los datos estructurados en JSON.';
  if (params.notaContexto || params.remitente || params.chatNombre) {
    userPrompt += `\nContexto adicional del mensaje:\n`;
    if (params.chatNombre) userPrompt += `- Chat de origen: ${params.chatNombre}\n`;
    if (params.remitente) userPrompt += `- Remitente del mensaje: ${params.remitente}\n`;
    if (params.notaContexto) userPrompt += `- Texto/nota del mensaje: "${params.notaContexto}"\n`;
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_VISION },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const rawJson = response.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(rawJson);
    const items: ExtraccionComprobante[] = parsed.comprobantes || (parsed.tipo ? [parsed] : []);
    return items;
  } catch (err) {
    console.error('Error parseando JSON de Vision:', err, rawJson);
    throw new Error('No se pudo estructurar el comprobante desde la respuesta visual.');
  }
}

/**
 * Registra uno o varios comprobantes procesados en el almacén
 */
export async function registrarComprobantesExtraidos(params: {
  extracciones: ExtraccionComprobante[];
  imagenUrl?: string;
  chatNombre?: string;
  remitente?: string;
}): Promise<ComprobanteGastoView[]> {
  const store = await getGastosStore();
  const anioMes = new Date().toISOString().slice(0, 7).replace('-', '');
  
  const nuevos: ComprobanteGastoView[] = [];

  for (let i = 0; i < params.extracciones.length; i++) {
    const ext = params.extracciones[i];
    const indexSeq = store.comprobantes.length + i + 1;
    const seqStr = String(indexSeq).padStart(3, '0');
    const folio = `GST-${anioMes}-${seqStr}`;
    const id = `gst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const item: ComprobanteGastoView = {
      id,
      folio,
      tipo: ext.tipo || 'EGRESO',
      monto: Number(ext.monto) || 0,
      moneda: ext.moneda || 'USD',
      monto_usd: ext.moneda === 'USD' ? Number(ext.monto) : undefined,
      fecha: ext.fecha || new Date().toISOString().split('T')[0],
      hora: ext.hora || undefined,
      destinatario: ext.destinatario || 'Desconocido',
      titular_enrolado: ext.titular_enrolado,
      pagador: ext.pagador_o_remitente || params.remitente || 'Movida TCI',
      medio_pago: ext.medio_pago || 'Transferencia',
      banco: ext.banco,
      referencia: ext.referencia || `${ext.medio_pago || 'PAGO'}-${folio}`,
      nota_whatsapp: ext.nota_whatsapp,
      remitente_chat: params.remitente,
      chat_origen: params.chatNombre || 'WhatsApp Buzón',
      imagen_url: params.imagenUrl,
      resumen_ejecutivo: ext.resumen_ejecutivo || `${ext.tipo === 'EGRESO' ? 'Pago' : 'Cobro'} de $${ext.monto} ${ext.moneda} a ${ext.destinatario}`,
      estado: 'PENDIENTE',
      confianza: ext.confianza || 0.9,
      proveedor_nombre: ext.proveedor_sugerido,
      proyecto_nombre: ext.proyecto_sugerido,
      creadoEn: new Date().toISOString(),
    };

    nuevos.push(item);
  }

  // Insertar al inicio de la lista
  store.comprobantes = [...nuevos, ...store.comprobantes];
  await saveGastosStore(store);

  return nuevos;
}

/**
 * Concilia un comprobante contra una CuentaPorPagar existente o crea un MovimientoFinanciero en Prisma
 */
export async function conciliarComprobante(params: {
  comprobanteId: string;
  cuentaPorPagarId?: string;
  crearMovimientoFinanciero?: boolean;
  categoria?: string;
  usuario?: string;
  proyectoId?: string;
}): Promise<{ success: boolean; message: string; comprobante: ComprobanteGastoView }> {
  const store = await getGastosStore();
  const index = store.comprobantes.findIndex(c => c.id === params.comprobanteId);
  if (index === -1) {
    throw new Error('Comprobante no encontrado en el buzón.');
  }

  const comp = store.comprobantes[index];

  let cuentaPorPagarFolio: string | undefined;
  let proveedorId: string | undefined;
  let proveedorNombre: string | undefined;
  let movimientoId: string | undefined;

  // 1. Conciliar contra Cuenta por Pagar si se indicó
  if (params.cuentaPorPagarId) {
    const cxp = await prisma.cuentaPorPagar.findUnique({
      where: { id: params.cuentaPorPagarId },
      include: { proveedor: true },
    });

    if (!cxp) throw new Error('La cuenta por pagar seleccionada no existe.');

    cuentaPorPagarFolio = cxp.folio;
    proveedorId = cxp.proveedor_id;
    proveedorNombre = cxp.proveedor?.nombre;

    const nuevoMontoPagado = (cxp.monto_pagado || 0) + comp.monto;
    const nuevoEstatus = nuevoMontoPagado >= cxp.monto_total ? 'PAGADA' : 'PAGADA_PARCIALMENTE';

    // Crear PagoParcial
    const pagoParcial = await prisma.pagoParcial.create({
      data: {
        cuenta_por_pagar_id: cxp.id,
        monto: comp.monto,
        fecha: new Date(comp.fecha ? `${comp.fecha}T12:00:00Z` : Date.now()),
        metodo_pago: comp.medio_pago || 'Transferencia',
        referencia: comp.referencia || comp.folio,
      },
    });

    // Actualizar saldo de la Cuenta por Pagar
    await prisma.cuentaPorPagar.update({
      where: { id: cxp.id },
      data: {
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
      },
    });

    // Crear MovimientoFinanciero reflejado
    if (params.crearMovimientoFinanciero !== false) {
      const mov = await prisma.movimientoFinanciero.create({
        data: {
          fecha: new Date(comp.fecha ? `${comp.fecha}T12:00:00Z` : Date.now()),
          descripcion: `[Pago ${comp.folio}] ${comp.resumen_ejecutivo} (CXP: ${cxp.folio})`,
          monto: comp.moneda === 'USD' ? comp.monto * 18.5 : comp.monto,
          monto_usd: comp.moneda === 'USD' ? comp.monto : null,
          tipo_flujo: 'OPERATIVO',
          sentido: comp.tipo === 'INGRESO' ? 'INGRESO' : 'EGRESO',
          origen: `${comp.medio_pago} - ${comp.banco || 'Bancos'}`,
          categoria_egreso: params.categoria || 'Proveedores / Honorarios',
          proyecto_id: params.proyectoId || cxp.proyecto_id || null,
          es_fiscal: false,
        },
      });
      movimientoId = mov.id;

      await prisma.pagoParcial.update({
        where: { id: pagoParcial.id },
        data: { movimiento_id: mov.id },
      });
    }
  } else {
    // 2. Conciliar como Movimiento Financiero directo
    const mov = await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(comp.fecha ? `${comp.fecha}T12:00:00Z` : Date.now()),
        descripcion: `[Buzón ${comp.folio}] ${comp.resumen_ejecutivo}`,
        monto: comp.moneda === 'USD' ? comp.monto * 18.5 : comp.monto,
        monto_usd: comp.moneda === 'USD' ? comp.monto : null,
        tipo_flujo: 'OPERATIVO',
        sentido: comp.tipo === 'INGRESO' ? 'INGRESO' : 'EGRESO',
        origen: `${comp.medio_pago} - ${comp.banco || 'WhatsApp Buzón'}`,
        categoria_egreso: comp.tipo === 'EGRESO' ? (params.categoria || 'Gastos Operativos') : null,
        categoria_ingreso: comp.tipo === 'INGRESO' ? (params.categoria || 'Ingresos Operativos') : null,
        proyecto_id: params.proyectoId || null,
        es_fiscal: false,
      },
    });
    movimientoId = mov.id;
  }

  // Actualizar estado del comprobante
  comp.estado = 'CONCILIADO';
  comp.conciliadoEn = new Date().toISOString();
  comp.conciliadoPor = params.usuario || 'Jonathan Palacios';
  comp.cuenta_por_pagar_id = params.cuentaPorPagarId;
  comp.cuenta_por_pagar_folio = cuentaPorPagarFolio;
  comp.proveedor_id = proveedorId;
  comp.proveedor_nombre = proveedorNombre || comp.proveedor_nombre;
  comp.movimiento_financiero_id = movimientoId;

  store.comprobantes[index] = comp;
  await saveGastosStore(store);

  return {
    success: true,
    message: `Comprobante ${comp.folio} conciliado exitosamente.`,
    comprobante: comp,
  };
}

/**
 * Descarta un comprobante por ser duplicado, inválido o no procedente
 */
export async function descartarComprobante(comprobanteId: string, motivo?: string): Promise<ComprobanteGastoView> {
  const store = await getGastosStore();
  const index = store.comprobantes.findIndex(c => c.id === comprobanteId);
  if (index === -1) throw new Error('Comprobante no encontrado.');

  store.comprobantes[index].estado = 'DESCARTADO';
  if (motivo) {
    store.comprobantes[index].resumen_ejecutivo += ` [Descartado: ${motivo}]`;
  }
  await saveGastosStore(store);
  return store.comprobantes[index];
}

/**
 * Reactiva un comprobante a estado PENDIENTE
 */
export async function reactivarComprobante(comprobanteId: string): Promise<ComprobanteGastoView> {
  const store = await getGastosStore();
  const index = store.comprobantes.findIndex(c => c.id === comprobanteId);
  if (index === -1) throw new Error('Comprobante no encontrado.');

  store.comprobantes[index].estado = 'PENDIENTE';
  store.comprobantes[index].conciliadoEn = undefined;
  store.comprobantes[index].conciliadoPor = undefined;
  await saveGastosStore(store);
  return store.comprobantes[index];
}
