'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProyectoStatus } from "@prisma/client"

// Helper: Get next PROJ-M code
async function getNextProyectoCodigo(): Promise<string> {
  const last = await prisma.proyecto.findFirst({
    where: { codigo: { startsWith: 'PROJ-M' } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true }
  })

  if (last?.codigo) {
    const numStr = last.codigo.replace('PROJ-M', '')
    const nextNum = parseInt(numStr, 10) + 1
    return `PROJ-M${nextNum}`
  }

  return 'PROJ-M501'
}

export async function createProyecto(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const descripcion = formData.get('descripcion') as string | null
    const cliente_id = formData.get('cliente_id') as string | null
    const fecha_inicio_str = formData.get('fecha_inicio') as string | null
    const fecha_fin_str = formData.get('fecha_fin') as string | null

    if (!nombre || !cliente_id) {
      return { success: false, error: 'El nombre y el cliente son obligatorios' }
    }

    const codigo = await getNextProyectoCodigo()

    const proyecto = await prisma.proyecto.create({
      data: {
        nombre,
        codigo,
        descripcion: descripcion || null,
        cliente_id,
        estado: 'PLANIFICACION',
        fecha_inicio: fecha_inicio_str ? new Date(fecha_inicio_str) : null,
        fecha_fin: fecha_fin_str ? new Date(fecha_fin_str) : null,
      }
    })

    revalidatePath('/proyectos')
    return { success: true, data: proyecto }
  } catch (error) {
    console.error("Error creating proyecto:", error)
    return { success: false, error: 'Ocurrió un error al crear el proyecto' }
  }
}

export async function updateProyecto(id: string, data: any) {
  try {
    // Don't allow overwriting the auto-generated codigo
    const { codigo, ...safeData } = data
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: safeData
    })
    revalidatePath('/proyectos')
    return { success: true, data: proyecto }
  } catch (error) {
    console.error("Error updating proyecto:", error)
    return { success: false, error: 'Ocurrió un error al actualizar el proyecto' }
  }
}

export async function deleteProyecto(id: string) {
  try {
    await prisma.proyecto.delete({ where: { id } })
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error("Error deleting proyecto:", error)
    return { success: false, error: 'Ocurrió un error al eliminar el proyecto' }
  }
}

// Assign PROJ-M501 to PROJ-M506 to existing projects that have no code
export async function assignLegacyCodes() {
  try {
    const proyectosSinCodigo = await prisma.proyecto.findMany({
      where: {
        OR: [
          { codigo: null },
          { codigo: '' }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })

    let nextNum = 501
    // Check if any PROJ-M codes already exist
    const last = await prisma.proyecto.findFirst({
      where: { codigo: { startsWith: 'PROJ-M' } },
      orderBy: { codigo: 'desc' },
      select: { codigo: true }
    })
    if (last?.codigo) {
      const num = parseInt(last.codigo.replace('PROJ-M', ''), 10)
      nextNum = num + 1
    }

    for (const p of proyectosSinCodigo) {
      await prisma.proyecto.update({
        where: { id: p.id },
        data: { codigo: `PROJ-M${nextNum}` }
      })
      nextNum++
    }

    revalidatePath('/proyectos')
    return { success: true, assigned: proyectosSinCodigo.length }
  } catch (error) {
    console.error("Error assigning legacy codes:", error)
    return { success: false, error: 'Error al asignar códigos legacy' }
  }
}

// Get list of projects for selectors in financial forms
export async function getProyectosList() {
  return prisma.proyecto.findMany({
    select: { id: true, nombre: true, codigo: true },
    orderBy: { createdAt: 'desc' }
  })
}

