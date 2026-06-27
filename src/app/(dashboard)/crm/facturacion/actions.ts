'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrefactura(data: { cliente_id: string, monto_total: number, cotizacion_id?: string }) {
  try {
    // Generate a folio: PRE-XXXX
    const folio = `PRE-${Math.floor(1000 + Math.random() * 9000)}`;

    const factura = await prisma.factura.create({
      data: {
        folio,
        cliente_id: data.cliente_id,
        cotizacion_id: data.cotizacion_id,
        monto_total: data.monto_total,
        estatus: 'PENDIENTE', // PENDIENTE = Cuentas por Cobrar
        fecha_emision: new Date(),
        // Default vencimiento a 15 días
        fecha_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
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
