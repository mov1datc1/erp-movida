'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProyectoStatus } from "@prisma/client"

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

    const proyecto = await prisma.proyecto.create({
      data: {
        nombre,
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
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data
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
