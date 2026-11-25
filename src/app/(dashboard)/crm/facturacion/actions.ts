'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MetodoPagoCFDI } from "@prisma/client";

export type FacturaItemInput = {
  producto_id?: string | null;
  linea_producto_id?: string | null;
  descripcion: string;
  detalle?: string | null;
  cantidad: number;
  precio_unitario: number;
  monto_total?: number;
};

function normalizeFacturaItems(items?: FacturaItemInput[]) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && (item.descripcion?.trim() || Number(item.precio_unitario) > 0))
    .map((item, index) => {
      const cantidad = Math.max(0.01, Number(item.cantidad) || 1);
      const precio_unitario = Math.max(0, Number(item.precio_unitario) || 0);
      const monto_total = Number((cantidad * precio_unitario).toFixed(2));
      return {
        producto_id: item.producto_id || null,
        linea_producto_id: item.linea_producto_id || null,
        descripcion: item.descripcion?.trim() || 'Concepto',
        detalle: item.detalle?.trim() || null,
        cantidad,
        precio_unitario,
        monto_total,
        orden: index,
      };
    });
}

function buildItemsSummary(items: ReturnType<typeof normalizeFacturaItems>, fallback?: string) {
  if (items.length === 0) return fallback?.trim() || undefined;
  if (items.length === 1) {
    const first = items[0];
    return first.cantidad !== 1 ? `${first.cantidad}x ${first.descripcion}` : first.descripcion;
  }
  const extra = items.length - 1;
  return `${items[0].descripcion} (+${extra} ${extra === 1 ? 'concepto más' : 'conceptos más'})`;
}

export async function createPrefactura(data: { cliente_id: string, monto_total: number, cotizacion_id?: string, fecha_vencimiento?: string, descripcion?: string, notas?: string, linea_producto_id?: string, categoria?: string, proyecto_id?: string, items?: FacturaItemInput[] }) {
  try {
    const folio = `PRE-${Math.floor(1000 + Math.random() * 9000)}`;
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const normalizedItems = normalizeFacturaItems(data.items);
    const computedTotal = normalizedItems.length > 0
      ? Number(normalizedItems.reduce((sum, i) => sum + i.monto_total, 0).toFixed(2))
      : data.monto_total;
    const montoFinal = computedTotal > 0 ? computedTotal : data.monto_total;
    const descripcionFinal = normalizedItems.length > 0
      ? buildItemsSummary(normalizedItems, data.descripcion)
      : (data.descripcion?.trim() || undefined);
    const lineaFinal = data.linea_producto_id || normalizedItems.find((i) => i.linea_producto_id)?.linea_producto_id || null;

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        cotizacion_id: data.cotizacion_id,
        monto_total: montoFinal,
        descripcion: descripcionFinal,
        notas: data.notas?.trim() || null,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        fecha_vencimiento: fechaVen,
        linea_producto_id: lineaFinal,
        categoria: data.categoria,
        proyecto_id: data.proyecto_id || null,
        ...(normalizedItems.length > 0 && {
          items: {
            create: normalizedItems,
          },
        }),
      },
      include: { items: { orderBy: { orden: 'asc' } } },
    });

    revalidatePath('/crm/facturacion');
    revalidatePath('/contable');
    if (data.cotizacion_id) {
      revalidatePath(`/crm/cotizaciones/${data.cotizacion_id}`);
    }

    return { success: true, factura };
  } catch (error) {
    console.error('Error creating prefactura:', error);
    return { success: false, error: 'Ocurrió un error al crear la cuenta por cobrar / prefactura' };
  }
}

export async function updatePrefactura(id: string, data: { cliente_id: string, monto_total: number, fecha_vencimiento?: string, descripcion?: string, notas?: string, linea_producto_id?: string, categoria?: string, detalle_horas?: string, numero_orden?: string, mes_servicio?: string, tipo_servicio?: string, plataformas?: string, proyecto_id?: string, items?: FacturaItemInput[] }) {
  try {
    const existing = await prisma.factura.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Prefactura no encontrada' };
    }

    const isLockedFinancially = existing.estatus === 'PAGADA' || existing.estatus === 'CANCELADA';
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : null;
    const hasItemsPayload = Array.isArray(data.items);
    const normalizedItems = hasItemsPayload ? normalizeFacturaItems(data.items) : [];

    const computedTotal = normalizedItems.length > 0
      ? Number(normalizedItems.reduce((sum, i) => sum + i.monto_total, 0).toFixed(2))
      : data.monto_total;
    const montoFinal = isLockedFinancially
      ? existing.monto_total
      : (computedTotal > 0 ? computedTotal : data.monto_total);

    if (!isLockedFinancially && (existing.monto_pagado || 0) > 0 && montoFinal < existing.monto_pagado) {
      return {
        success: false,
        error: `El monto total ($${montoFinal.toFixed(2)}) no puede ser menor al monto ya pagado ($${existing.monto_pagado.toFixed(2)}).`,
      };
    }

    const descripcionFinal = normalizedItems.length > 0
      ? buildItemsSummary(normalizedItems, data.descripcion)
      : (data.descripcion?.trim() || null);
    const lineaFinal = data.linea_producto_id || normalizedItems.find((i) => i.linea_producto_id)?.linea_producto_id || existing.linea_producto_id || null;

    await prisma.$transaction(async (tx) => {
      if (hasItemsPayload && !isLockedFinancially) {
        await tx.facturaItem.deleteMany({ where: { factura_id: id } });
      }

      await tx.factura.update({
        where: { id },
        data: {
          ...(!isLockedFinancially && {
            cliente_id: data.cliente_id,
            monto_total: montoFinal,
            categoria: data.categoria,
            linea_producto_id: lineaFinal,
          }),
          descripcion: descripcionFinal,
          notas: data.notas !== undefined ? (data.notas.trim() || null) : existing.notas,
          detalle_horas: data.detalle_horas,
          numero_orden: data.numero_orden,
          mes_servicio: data.mes_servicio,
          tipo_servicio: data.tipo_servicio,
          plataformas: data.plataformas,
          proyecto_id: data.proyecto_id || null,
          ...(fechaVen && !isLockedFinancially && { fecha_vencimiento: fechaVen }),
          ...(hasItemsPayload && !isLockedFinancially && normalizedItems.length > 0 && {
            items: {
              create: normalizedItems,
            },
          }),
        }
      });
    });

    revalidatePath('/crm/facturacion');
    revalidatePath('/contable');
    return { success: true };
  } catch (error) {
    console.error('Error updating prefactura:', error);
    return { success: false, error: 'Error al actualizar la prefactura' };
  }
}

export async function eliminarFactura(id: string) {
  try {
    // Verificar si tiene pagos
    const factura = await prisma.factura.findUnique({ where: { id } });
    if (factura && factura.monto_pagado && factura.monto_pagado > 0) {
      return { success: false, error: 'No se puede eliminar una factura que ya tiene pagos registrados.' };
    }
    await prisma.factura.delete({ where: { id } });
    revalidatePath('/crm/facturacion');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Error al eliminar la factura' };
  }
}

export async function markFacturaAsPagada(id: string, registerInFinance: boolean) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!factura) throw new Error('Factura no encontrada');

    await prisma.factura.update({
      where: { id },
      data: { estatus: 'PAGADA' }
    });

    if (registerInFinance) {
      // Create associated finance movement
      await prisma.movimientoFinanciero.create({
        data: {
          fecha: new Date(),
          descripcion: `Pago de Factura ${factura.folio} - ${factura.cliente.nombre}`,
          monto: factura.monto_total,
          tipo_flujo: 'OPERATIVO',
          sentido: 'INGRESO',
          origen: 'Transferencia / Banco',
          categoria_ingreso: factura.categoria || 'Ventas y Servicios',
          linea_producto_id: factura.linea_producto_id || null
        }
      });
    }

    revalidatePath('/crm/facturacion');
    revalidatePath('/contable');
    return { success: true };
  } catch (error) {
    console.error('Error marking factura pagada:', error);
    return { success: false, error: 'Error al actualizar el estado a pagada' };
  }
}

// ---------------------------
// FAVORITOS (CXC)
// ---------------------------
export async function saveFavoritoCXC(data: { titulo: string, monto: number, descripcion?: string, cliente_id: string }) {
  try {
    await prisma.transaccionFrecuente.create({
      data: {
        tipo: 'CXC',
        titulo: data.titulo,
        monto: data.monto,
        descripcion: data.descripcion,
        cliente_id: data.cliente_id
      }
    });
    revalidatePath('/crm/facturacion');
    return { success: true };
  } catch (error) {
    console.error('Error saving favorito:', error);
    return { success: false, error: 'Error al guardar favorito' };
  }
}

export async function deleteFavoritoCXC(id: string) {
  try {
    await prisma.transaccionFrecuente.delete({ where: { id } });
    revalidatePath('/crm/facturacion');
    return { success: true };
  } catch (error) {
    console.error('Error deleting favorito:', error);
    return { success: false, error: 'Error al eliminar favorito' };
  }
}

export async function solicitarFacturacionCFDI(facturaId: string) {
  try {
    const factura = await prisma.factura.update({
      where: { id: facturaId },
      data: {
        requiere_cfdi: true,
        estatus_cfdi: 'EN_BORRADOR'
      }
    });

    revalidatePath('/crm/facturacion');
    return { success: true, factura };
  } catch (error) {
    console.error('Error solicitando CFDI:', error);
    return { success: false, error: 'Ocurrió un error al mover la prefactura a CFDI' };
  }
}

export async function timbrarFacturaCFDI(facturaId: string, timbradoData: {
  uso_cfdi: string;
  regimen_fiscal: string;
  forma_pago: string;
  metodo_pago: string;
  clave_producto: string;
}) {
  try {
    const { getFacturapiClient } = await import('@/lib/facturapi');
    const facturapi = await getFacturapiClient();

    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: { cliente: true, items: { orderBy: { orden: 'asc' } } }
    });

    if (!factura) throw new Error("Factura no encontrada");
    if (!factura.cliente.rfc_taxid || !factura.cliente.codigo_postal) {
      throw new Error("El cliente debe tener RFC y Código Postal configurados en su perfil para poder facturar.");
    }

    // Actualizar datos fiscales del cliente en la DB
    await prisma.cliente.update({
      where: { id: factura.cliente_id },
      data: { regimen_fiscal: timbradoData.regimen_fiscal }
    });

    // 1. Crear o encontrar cliente en Facturapi
    const customer = await facturapi.customers.create({
      legal_name: factura.cliente.razon_social || factura.cliente.nombre,
      tax_id: factura.cliente.rfc_taxid,
      tax_system: timbradoData.regimen_fiscal,
      address: {
        zip: factura.cliente.codigo_postal
      },
      email: factura.cliente.email || undefined
    });

    // 2. Crear productos en Facturapi (múltiples ítems si existen, o uno genérico)
    const invoiceItems: { product: string; quantity: number }[] = [];
    if (factura.items && factura.items.length > 0) {
      for (const item of factura.items) {
        const desc = item.detalle ? `${item.descripcion} - ${item.detalle}` : item.descripcion;
        const prod = await facturapi.products.create({
          description: desc,
          product_key: timbradoData.clave_producto,
          price: item.precio_unitario,
          taxes: [{ type: 'IVA', rate: 0.16 }]
        });
        invoiceItems.push({ product: prod.id, quantity: item.cantidad });
      }
    } else {
      const product = await facturapi.products.create({
        description: factura.descripcion || 'Servicios según cotización',
        product_key: timbradoData.clave_producto,
        price: factura.monto_total,
        taxes: [{ type: 'IVA', rate: 0.16 }]
      });
      invoiceItems.push({ product: product.id, quantity: 1 });
    }

    // 3. Generar Recibo/Factura (Invoice) en Facturapi
    const invoice = await facturapi.invoices.create({
      customer: customer.id,
      items: invoiceItems,
      use: timbradoData.uso_cfdi,
      payment_form: timbradoData.forma_pago,
      payment_method: timbradoData.metodo_pago
    });

    // 4. Descargar PDF y XML URLs 
    // Facturapi ya nos regresa un objeto con los links directos una vez timbrada exitosamente
    
    const updatedFactura = await prisma.factura.update({
      where: { id: facturaId },
      data: {
        estatus_cfdi: 'FACTURADO',
        folio_fiscal: invoice.folio_number?.toString() || invoice.id,
        uuid_sat: invoice.uuid,
        facturapi_id: invoice.id,
        url_pdf: invoice.verification_url, // Usando la URL de validación temporalmente, o facturapi dashboard url
        url_xml: invoice.verification_url, 
        forma_pago: timbradoData.forma_pago,
        metodo_pago: timbradoData.metodo_pago as MetodoPagoCFDI,
        uso_cfdi: timbradoData.uso_cfdi
      }
    });

    revalidatePath('/crm/facturacion');
    return { success: true, factura: updatedFactura };
  } catch (error: any) {
    console.error('Error timbrando CFDI:', error);
    return { success: false, error: error.message || 'Error desconocido al timbrar' };
  }
}

export async function crearFacturaUSA(data: { cliente_id: string, monto_total: number, monto_mxn_estimado?: number, descripcion?: string, notas?: string, linea_producto_id?: string, categoria?: string, detalle_horas?: string, numero_orden?: string, proyecto_id?: string, items?: FacturaItemInput[] }) {
  try {
    // Buscar la última factura USA para obtener el número actual
    const lastUsa = await prisma.factura.findFirst({
      where: { es_usa: true },
      orderBy: { numero_usa: 'desc' }
    });

    const nextNumero = lastUsa && lastUsa.numero_usa ? lastUsa.numero_usa + 15 : 1573;
    
    // Generar un UUID único para el folio fiscal de la exportación
    const folioFiscal = crypto.randomUUID().toUpperCase();
    const folio = `USA-${nextNumero}`;
    const normalizedItems = normalizeFacturaItems(data.items);
    const computedTotal = normalizedItems.length > 0
      ? Number(normalizedItems.reduce((sum, i) => sum + i.monto_total, 0).toFixed(2))
      : data.monto_total;
    const montoFinal = computedTotal > 0 ? computedTotal : data.monto_total;
    const descripcionFinal = normalizedItems.length > 0
      ? buildItemsSummary(normalizedItems, data.descripcion)
      : (data.descripcion?.trim() || undefined);
    const lineaFinal = data.linea_producto_id || normalizedItems.find((i) => i.linea_producto_id)?.linea_producto_id || null;

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        monto_total: montoFinal,
        monto_mxn_estimado: data.monto_mxn_estimado,
        descripcion: descripcionFinal,
        notas: data.notas?.trim() || null,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        es_usa: true,
        numero_usa: nextNumero,
        folio_fiscal: folioFiscal,
        linea_producto_id: lineaFinal,
        categoria: data.categoria || 'Ventas Internacionales',
        detalle_horas: data.detalle_horas,
        numero_orden: data.numero_orden,
        proyecto_id: data.proyecto_id || null,
        ...(normalizedItems.length > 0 && {
          items: { create: normalizedItems },
        }),
      }
    });

    revalidatePath('/crm/facturacion');
    return { success: true, factura };
  } catch (error) {
    console.error('Error creating USA Invoice:', error);
    return { success: false, error: 'No se pudo crear la Factura USA' };
  }
}

export async function crearFacturaMX(data: { cliente_id: string, monto_total: number, descripcion?: string, notas?: string, linea_producto_id?: string, categoria?: string, mes_servicio?: string, tipo_servicio?: string, plataformas?: string, proyecto_id?: string, items?: FacturaItemInput[] }) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${currentYear}${currentMonth}`; // ej: 202607

    // Buscar la última factura MX para obtener el número actual
    const lastMx = await prisma.factura.findFirst({
      where: { es_mx: true },
      orderBy: { numero_mx: 'desc' }
    });

    let nextNumeroStr = `${prefix}05`; // Inicia en 05
    
    if (lastMx && lastMx.numero_mx) {
      const lastNumeroStr = lastMx.numero_mx.toString();
      // Si la última factura es del mismo año y mes
      if (lastNumeroStr.startsWith(prefix)) {
        const lastCounter = parseInt(lastNumeroStr.slice(6));
        const nextCounter = (lastCounter + 5).toString().padStart(2, '0');
        nextNumeroStr = `${prefix}${nextCounter}`;
      }
    }

    const nextNumero = parseInt(nextNumeroStr);
    
    // Generar un UUID único para el folio fiscal de MX
    const folioFiscal = crypto.randomUUID().toUpperCase();
    const folio = `MX-${nextNumero}`;
    const normalizedItems = normalizeFacturaItems(data.items);
    const computedTotal = normalizedItems.length > 0
      ? Number(normalizedItems.reduce((sum, i) => sum + i.monto_total, 0).toFixed(2))
      : data.monto_total;
    const montoFinal = computedTotal > 0 ? computedTotal : data.monto_total;
    const descripcionFinal = normalizedItems.length > 0
      ? buildItemsSummary(normalizedItems, data.descripcion)
      : (data.descripcion?.trim() || undefined);
    const lineaFinal = data.linea_producto_id || normalizedItems.find((i) => i.linea_producto_id)?.linea_producto_id || null;

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        monto_total: montoFinal,
        descripcion: descripcionFinal,
        notas: data.notas?.trim() || null,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        es_mx: true,
        numero_mx: nextNumero,
        folio_fiscal: folioFiscal,
        linea_producto_id: lineaFinal,
        categoria: data.categoria || 'Ventas Nacionales',
        mes_servicio: data.mes_servicio,
        tipo_servicio: data.tipo_servicio,
        plataformas: data.plataformas,
        proyecto_id: data.proyecto_id || null,
        ...(normalizedItems.length > 0 && {
          items: { create: normalizedItems },
        }),
      }
    });

    revalidatePath('/crm/facturacion');
    return { success: true, factura };
  } catch (error) {
    console.error('Error creating MX Invoice:', error);
    return { success: false, error: 'No se pudo crear la Factura MX' };
  }
}
