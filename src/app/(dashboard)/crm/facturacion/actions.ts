'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MetodoPagoCFDI } from "@prisma/client";

export async function createPrefactura(data: { cliente_id: string, monto_total: number, cotizacion_id?: string, fecha_vencimiento?: string, descripcion?: string, linea_producto_id?: string, categoria?: string }) {
  try {
    const folio = `PRE-${Math.floor(1000 + Math.random() * 9000)}`;
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        cotizacion_id: data.cotizacion_id,
        monto_total: data.monto_total,
        descripcion: data.descripcion,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        fecha_vencimiento: fechaVen,
        linea_producto_id: data.linea_producto_id || null,
        categoria: data.categoria
      }
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

export async function updatePrefactura(id: string, data: { cliente_id: string, monto_total: number, fecha_vencimiento?: string, descripcion?: string, linea_producto_id?: string, categoria?: string }) {
  try {
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : null;
    
    await prisma.factura.update({
      where: { id },
      data: {
        cliente_id: data.cliente_id,
        monto_total: data.monto_total,
        descripcion: data.descripcion,
        linea_producto_id: data.linea_producto_id || null,
        categoria: data.categoria,
        ...(fechaVen && { fecha_vencimiento: fechaVen })
      }
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
      include: { cliente: true }
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

    // 2. Crear producto en Facturapi (Generic based on description or generic name)
    const product = await facturapi.products.create({
      description: factura.descripcion || 'Servicios según cotización',
      product_key: timbradoData.clave_producto,
      price: factura.monto_total,
      taxes: [
        {
          type: 'IVA',
          rate: 0.16
        }
      ]
    });

    // 3. Generar Recibo/Factura (Invoice) en Facturapi
    // Nota: Facturapi maneja los montos considerando el IVA si es necesario.
    // Si factura.monto_total ya incluye IVA, habría que ajustar esto o usar un tax rate de IVA retenido/trasladado, 
    // pero para este boilerplate asumiremos que Facturapi calculará el tax_included si pasamos price. 
    // Lo ideal es mandar el precio base, pero para simplificar, usaremos los defaults.
    const invoice = await facturapi.invoices.create({
      customer: customer.id,
      items: [
        {
          product: product.id,
          quantity: 1
        }
      ],
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

export async function crearFacturaUSA(data: { cliente_id: string, monto_total: number, monto_mxn_estimado?: number, descripcion?: string, linea_producto_id?: string, categoria?: string }) {
  try {
    // Buscar la última factura USA para obtener el número actual
    const lastUsa = await prisma.factura.findFirst({
      where: { es_usa: true },
      orderBy: { numero_usa: 'desc' }
    });

    const nextNumero = lastUsa && lastUsa.numero_usa ? lastUsa.numero_usa + 15 : 1558;
    
    // Generar un UUID único para el folio fiscal de la exportación
    const folioFiscal = crypto.randomUUID().toUpperCase();
    const folio = `USA-${nextNumero}`;

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        monto_total: data.monto_total,
        monto_mxn_estimado: data.monto_mxn_estimado,
        descripcion: data.descripcion,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        es_usa: true,
        numero_usa: nextNumero,
        folio_fiscal: folioFiscal,
        linea_producto_id: data.linea_producto_id,
        categoria: data.categoria || 'Ventas Internacionales'
      }
    });

    revalidatePath('/crm/facturacion');
    return { success: true, factura };
  } catch (error) {
    console.error('Error creating USA Invoice:', error);
    return { success: false, error: 'No se pudo crear la Factura USA' };
  }
}
