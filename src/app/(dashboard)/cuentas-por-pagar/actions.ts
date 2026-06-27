'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---------------------------
// PROVEEDORES
// ---------------------------
export async function createProveedor(data: { nombre: string, empresa?: string }) {
  try {
    const p = await prisma.proveedor.create({ data });
    revalidatePath('/cuentas-por-pagar');
    return { success: true, data: p };
  } catch (error) {
    console.error('Error creating proveedor:', error);
    return { success: false, error: 'Error al crear el proveedor' };
  }
}

// ---------------------------
// CUENTAS POR PAGAR
// ---------------------------
export async function createCuentaPorPagar(data: { proveedor_id: string, monto_total: number, fecha_vencimiento?: string, descripcion?: string }) {
  try {
    const folio = `CXP-${Math.floor(1000 + Math.random() * 9000)}`;
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    
    await prisma.cuentaPorPagar.create({
      data: {
        folio,
        proveedor_id: data.proveedor_id,
        monto_total: data.monto_total,
        descripcion: data.descripcion,
        estatus: 'PENDIENTE',
        fecha_emision: new Date(),
        fecha_vencimiento: fechaVen
      }
    });

    revalidatePath('/cuentas-por-pagar');
    return { success: true };
  } catch (error) {
    console.error('Error creating CXP:', error);
    return { success: false, error: 'Error al crear la cuenta por pagar' };
  }
}

export async function updateCuentaPorPagar(id: string, data: { proveedor_id: string, monto_total: number, fecha_vencimiento?: string, descripcion?: string }) {
  try {
    const fechaVen = data.fecha_vencimiento ? new Date(`${data.fecha_vencimiento}T12:00:00Z`) : null;
    
    await prisma.cuentaPorPagar.update({
      where: { id },
      data: {
        proveedor_id: data.proveedor_id,
        monto_total: data.monto_total,
        descripcion: data.descripcion,
        ...(fechaVen && { fecha_vencimiento: fechaVen })
      }
    });

    revalidatePath('/cuentas-por-pagar');
    return { success: true };
  } catch (error) {
    console.error('Error updating CXP:', error);
    return { success: false, error: 'Error al actualizar la cuenta por pagar' };
  }
}

export async function markCuentaAsPagada(id: string, registerInFinance: boolean) {
  try {
    const cxp = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: { proveedor: true }
    });

    if (!cxp) throw new Error('Cuenta por pagar no encontrada');

    await prisma.cuentaPorPagar.update({
      where: { id },
      data: { estatus: 'PAGADA' }
    });

    if (registerInFinance) {
      await prisma.movimientoFinanciero.create({
        data: {
          fecha: new Date(),
          descripcion: `Pago de Cuenta ${cxp.folio} - ${cxp.proveedor.nombre}`,
          monto: cxp.monto_total,
          tipo_flujo: 'OPERATIVO',
          sentido: 'EGRESO',
          origen: 'Transferencia / Banco',
          categoria_egreso: 'Cuentas por Pagar',
        }
      });
    }

    revalidatePath('/cuentas-por-pagar');
    revalidatePath('/contable');
    return { success: true };
  } catch (error) {
    console.error('Error marking CXP pagada:', error);
    return { success: false, error: 'Error al actualizar el estado a pagada' };
  }
}

// ---------------------------
// FAVORITOS (CXP)
// ---------------------------
export async function saveFavoritoCXP(data: { titulo: string, monto: number, descripcion?: string, proveedor_id: string }) {
  try {
    await prisma.transaccionFrecuente.create({
      data: {
        tipo: 'CXP',
        titulo: data.titulo,
        monto: data.monto,
        descripcion: data.descripcion,
        proveedor_id: data.proveedor_id
      }
    });
    revalidatePath('/cuentas-por-pagar');
    return { success: true };
  } catch (error) {
    console.error('Error saving favorito:', error);
    return { success: false, error: 'Error al guardar favorito' };
  }
}

export async function deleteFavoritoCXP(id: string) {
  try {
    await prisma.transaccionFrecuente.delete({ where: { id } });
    revalidatePath('/cuentas-por-pagar');
    return { success: true };
  } catch (error) {
    console.error('Error deleting favorito:', error);
    return { success: false, error: 'Error al eliminar favorito' };
  }
}
