'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrefactura(data: { cliente_id: string, monto_total: number, cotizacion_id?: string, fecha_vencimiento?: string, descripcion?: string }) {
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
        fecha_vencimiento: fechaVen
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

export async function updatePrefactura(id: string, data: { cliente_id: string, monto_total: number, fecha_vencimiento?: string, descripcion?: string }) {
  try {
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : null;
    
    await prisma.factura.update({
      where: { id },
      data: {
        cliente_id: data.cliente_id,
        monto_total: data.monto_total,
        descripcion: data.descripcion,
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

export async function markFacturaAsPagada(id: string) {
  try {
    await prisma.factura.update({
      where: { id },
      data: { estatus: 'PAGADA' }
    });

    revalidatePath('/crm/facturacion');
    revalidatePath('/contable');
    return { success: true };
  } catch (error) {
    console.error('Error marking factura pagada:', error);
    return { success: false, error: 'Error al actualizar el estado a pagada' };
  }
}
