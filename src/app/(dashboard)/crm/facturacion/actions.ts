'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
