'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { SentidoMovimiento, TipoFlujo } from '@prisma/client'

export async function createMovimiento(data: {
  tipo: 'Ingreso' | 'Egreso',
  monto: number,
  fecha: string,
  categoria: string,
  descripcion: string
}) {
  try {
    await prisma.movimientoFinanciero.create({
      data: {
        fecha: new Date(data.fecha),
        descripcion: data.descripcion,
        monto: data.monto,
        sentido: data.tipo === 'Ingreso' ? SentidoMovimiento.INGRESO : SentidoMovimiento.EGRESO,
        tipo_flujo: TipoFlujo.OPERATIVO, // Default to operativo for now
        origen: 'Manual',
        categoria_ingreso: data.tipo === 'Ingreso' ? data.categoria : null,
        categoria_egreso: data.tipo === 'Egreso' ? data.categoria : null,
      }
    })

    revalidatePath('/contable')
    return { success: true }
  } catch (error) {
    console.error('Error creating movimiento:', error)
    return { success: false, error: 'Failed to create movimiento' }
  }
}
