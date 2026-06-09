'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prioridad, CategoriaTarea, TareaStatus } from "@prisma/client"

export async function createTarea(formData: FormData) {
  try {
    const titulo = formData.get('titulo') as string
    const descripcion = formData.get('descripcion') as string | null
    const prioridad = formData.get('prioridad') as Prioridad
    const categoria = formData.get('categoria') as CategoriaTarea
    const proyecto_id = formData.get('proyecto_id') as string | null
    const cliente_id = formData.get('cliente_id') as string | null
    const encargadosIds = formData.getAll('encargados') as string[]
    const fecha_limite_str = formData.get('fecha_limite') as string | null

    if (!titulo) {
      return { success: false, error: 'El título es obligatorio' }
    }

    const tarea = await prisma.tarea.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        prioridad: prioridad || 'MEDIA',
        categoria: categoria || 'OTRO',
        estatus: 'PENDIENTE',
        proyecto_id: proyecto_id || null,
        cliente_id: cliente_id || null,
        fecha_limite: fecha_limite_str ? new Date(fecha_limite_str) : null,
        encargados: {
          connect: encargadosIds.map(id => ({ id }))
        }
      }
    })

    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: tarea }
  } catch (error) {
    console.error("Error creating tarea:", error)
    return { success: false, error: 'Ocurrió un error al crear la tarea' }
  }
}

export async function updateTarea(id: string, updateData: any) {
  try {
    const { encargadosIds, ...rest } = updateData;
    
    const dataToUpdate: any = { ...rest };
    if (encargadosIds) {
      dataToUpdate.encargados = {
        set: encargadosIds.map((encId: string) => ({ id: encId }))
      };
    }

    const tarea = await prisma.tarea.update({
      where: { id },
      data: dataToUpdate
    })
    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: tarea }
  } catch (error) {
    console.error("Error updating tarea:", error)
    return { success: false, error: 'Ocurrió un error al actualizar la tarea' }
  }
}

export async function deleteTarea(id: string) {
  try {
    await prisma.tarea.delete({ where: { id } })
    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error("Error deleting tarea:", error)
    return { success: false, error: 'Ocurrió un error al eliminar la tarea' }
  }
}

export async function reorderTareas(updates: { id: string, orden: number }[]) {
  try {
    // Prisma does not support bulk update with different values easily in a single query
    // We will do it in a transaction
    await prisma.$transaction(
      updates.map(update => 
        prisma.tarea.update({
          where: { id: update.id },
          data: { orden: update.orden }
        })
      )
    )
    
    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error("Error reordering tareas:", error)
    return { success: false, error: 'Ocurrió un error al reordenar las tareas' }
  }
}

export async function createEncargado(formData: FormData) {
  try {
    // Ideally we would check auth here, but since auth is just assumed Admin for now:
    const nombre = formData.get('nombre') as string
    
    if (!nombre || nombre.trim() === '') {
      return { success: false, error: 'El nombre es obligatorio' }
    }

    const encargado = await prisma.encargado.create({
      data: { nombre: nombre.trim() }
    })

    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: encargado }
  } catch (error: any) {
    console.error("Error creating encargado:", error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Ya existe un encargado con ese nombre' }
    }
    return { success: false, error: 'Ocurrió un error al crear el encargado' }
  }
}

export async function addComentario(tarea_id: string, texto: string) {
  try {
    if (!texto || texto.trim() === '') {
      return { success: false, error: 'El comentario no puede estar vacío' }
    }

    const comentario = await prisma.comentarioTarea.create({
      data: {
        tarea_id,
        texto: texto.trim()
      }
    })

    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: comentario }
  } catch (error) {
    console.error("Error adding comentario:", error)
    return { success: false, error: 'Ocurrió un error al agregar el comentario' }
  }
}

export async function toggleFocus(id: string, is_focus: boolean) {
  try {
    const tarea = await prisma.tarea.update({
      where: { id },
      data: { is_focus }
    })
    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: tarea }
  } catch (error) {
    console.error("Error toggling focus:", error)
    return { success: false, error: 'Ocurrió un error al actualizar el focus de la tarea' }
  }
}

export async function deleteEncargado(id: string) {
  try {
    const encargado = await prisma.encargado.delete({
      where: { id }
    })
    revalidatePath('/tareas')
    revalidatePath('/proyectos')
    return { success: true, data: encargado }
  } catch (error) {
    console.error("Error deleting encargado:", error)
    return { success: false, error: 'Ocurrió un error al eliminar el encargado' }
  }
}
