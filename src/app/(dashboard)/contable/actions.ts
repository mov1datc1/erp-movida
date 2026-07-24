'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { SentidoMovimiento, TipoFlujo } from '@prisma/client'

export async function createMovimiento(data: {
  tipo: 'Ingreso' | 'Egreso',
  monto: number,
  monto_usd?: number,
  fecha: string,
  categoria: string,
  descripcion: string,
  origen: string,
  es_fiscal: boolean,
  linea_producto_id?: string | null,
  producto_servicio_id?: string | null,
  proyecto_id?: string | null
}) {
  try {
    await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(data.fecha),
        descripcion: data.descripcion,
        monto: data.monto,
        monto_usd: data.monto_usd || null,
        sentido: data.tipo === 'Ingreso' ? SentidoMovimiento.INGRESO : SentidoMovimiento.EGRESO,
        tipo_flujo: TipoFlujo.OPERATIVO, // Default to operativo for now
        origen: data.origen,
        categoria_ingreso: data.tipo === 'Ingreso' ? data.categoria : null,
        categoria_egreso: data.tipo === 'Egreso' ? data.categoria : null,
        es_fiscal: data.es_fiscal,
        linea_producto_id: data.linea_producto_id || null,
        producto_servicio_id: data.producto_servicio_id || null,
        proyecto_id: data.proyecto_id || null,
      }
    })

    revalidatePath('/contable')
    return { success: true }
  } catch (error) {
    console.error('Error creating movimiento:', error)
    return { success: false, error: 'Failed to create movimiento' }
  }
}

export async function updateMovimiento(
  id: string,
  data: {
    tipo: 'Ingreso' | 'Egreso',
    monto: number,
    monto_usd?: number,
    fecha: string,
    categoria: string,
    descripcion: string,
    origen: string,
    es_fiscal: boolean,
    linea_producto_id?: string | null,
    producto_servicio_id?: string | null,
    proyecto_id?: string | null
  }
) {
  try {
    await prisma.movimientoFinanciero.update({
      where: { id },
      data: {
        fecha: new Date(data.fecha),
        descripcion: data.descripcion,
        monto: data.monto,
        monto_usd: data.monto_usd || null,
        sentido: data.tipo === 'Ingreso' ? SentidoMovimiento.INGRESO : SentidoMovimiento.EGRESO,
        origen: data.origen,
        categoria_ingreso: data.tipo === 'Ingreso' ? data.categoria : null,
        categoria_egreso: data.tipo === 'Egreso' ? data.categoria : null,
        es_fiscal: data.es_fiscal,
        linea_producto_id: data.linea_producto_id || null,
        producto_servicio_id: data.producto_servicio_id || null,
        proyecto_id: data.proyecto_id || null,
      }
    })

    revalidatePath('/contable')
    return { success: true }
  } catch (error) {
    console.error('Error updating movimiento:', error)
    return { success: false, error: 'Failed to update movimiento' }
  }
}

export async function deleteMovimiento(id: string) {
  try {
    await prisma.movimientoFinanciero.delete({
      where: { id }
    })
    revalidatePath('/contable')
    return { success: true }
  } catch (error) {
    console.error('Error deleting movimiento:', error)
    return { success: false, error: 'Failed to delete movimiento' }
  }
}
