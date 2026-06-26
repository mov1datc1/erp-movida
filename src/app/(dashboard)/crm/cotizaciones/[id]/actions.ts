'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addCotizacionItem(cotizacion_id: string, data: { producto_id?: string, descripcion: string, cantidad: number, precio_unitario: number }) {
  try {
    const monto_total = data.cantidad * data.precio_unitario;

    const item = await prisma.cotizacionItem.create({
      data: {
        cotizacion_id,
        producto_id: data.producto_id || null,
        descripcion: data.descripcion,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario,
        monto_total
      }
    });

    // Update the quote total
    await updateCotizacionTotal(cotizacion_id);

    revalidatePath(`/crm/cotizaciones/${cotizacion_id}`);
    revalidatePath(`/crm/cotizaciones`);
    return { success: true, item };
  } catch (error) {
    console.error('Error adding cotizacion item:', error);
    return { success: false, error: 'Error al agregar el ítem a la cotización' };
  }
}

export async function deleteCotizacionItem(id: string, cotizacion_id: string) {
  try {
    await prisma.cotizacionItem.delete({
      where: { id }
    });

    // Update the quote total
    await updateCotizacionTotal(cotizacion_id);

    revalidatePath(`/crm/cotizaciones/${cotizacion_id}`);
    revalidatePath(`/crm/cotizaciones`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting cotizacion item:', error);
    return { success: false, error: 'Error al eliminar el ítem' };
  }
}

export async function updateCotizacionStatus(id: string, estatus: any) {
  try {
    await prisma.cotizacion.update({
      where: { id },
      data: { estatus }
    });
    
    revalidatePath(`/crm/cotizaciones/${id}`);
    revalidatePath(`/crm/cotizaciones`);
    return { success: true };
  } catch (error) {
    console.error('Error updating cotizacion status:', error);
    return { success: false, error: 'Error al actualizar el estatus' };
  }
}

async function updateCotizacionTotal(cotizacion_id: string) {
  const items = await prisma.cotizacionItem.findMany({
    where: { cotizacion_id }
  });

  const total = items.reduce((acc, curr) => acc + curr.monto_total, 0);

  await prisma.cotizacion.update({
    where: { id: cotizacion_id },
    data: { monto: total }
  });
}
