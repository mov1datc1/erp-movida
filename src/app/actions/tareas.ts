'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prioridad, CategoriaTarea, TareaStatus } from "@prisma/client"
import { sendTaskStatusNotification, sendSubtaskUpdateNotification } from "@/lib/email"

export async function createTarea(formData: FormData) {
  try {
    const titulo = formData.get('titulo') as string
    const descripcion = formData.get('descripcion') as string | null
    const prioridad = formData.get('prioridad') as Prioridad
    const categoria = formData.get('categoria') as CategoriaTarea
    const proyecto_id = formData.get('proyecto_id') as string | null
    const sprint_id = formData.get('sprint_id') as string | null
    const cliente_id = formData.get('cliente_id') as string | null
    const encargadosIds = formData.getAll('encargados') as string[]
    const fecha_limite_str = formData.get('fecha_limite') as string | null
    const horas_estimadas_str = formData.get('horas_estimadas') as string | null

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
        sprint_id: sprint_id || null,
        cliente_id: cliente_id || null,
        fecha_limite: fecha_limite_str ? new Date(fecha_limite_str) : null,
        horas_estimadas: horas_estimadas_str ? parseFloat(horas_estimadas_str) : null,
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
    // 1. Fetch existing task details to compare previous status and get project/sprint names
    const existing = await prisma.tarea.findUnique({
      where: { id },
      include: {
        proyecto: { select: { nombre: true } },
        sprint: { select: { numero: true, nombre: true } }
      }
    });

    const { encargadosIds, ...rest } = updateData;
    
    const dataToUpdate: any = { ...rest };
    if (encargadosIds) {
      dataToUpdate.encargados = {
        set: encargadosIds.map((encId: string) => ({ id: encId }))
      };
    }

    const tarea = await prisma.tarea.update({
      where: { id },
      data: dataToUpdate,
      include: {
        proyecto: { select: { nombre: true } },
        sprint: { select: { numero: true, nombre: true } },
        encargados: { select: { nombre: true } }
      }
    });

    // 2. Trigger SMTP Email Notification if status changed
    if (updateData.estatus && existing && existing.estatus !== updateData.estatus) {
      const userAuthorName = updateData.usuarioNombre || (tarea.encargados.length > 0 ? tarea.encargados.map(e => e.nombre).join(', ') : 'Usuario de Movida ERP');

      sendTaskStatusNotification({
        taskTitle: tarea.titulo,
        oldStatus: existing.estatus,
        newStatus: updateData.estatus,
        proyectoNombre: tarea.proyecto?.nombre || 'Sin Proyecto (General)',
        sprintNumero: tarea.sprint?.numero,
        sprintNombre: tarea.sprint?.nombre,
        usuarioNombre: userAuthorName,
      }).catch(err => console.error('Error enviando notificación SMTP:', err));
    }

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

export async function createSubtarea(tarea_id: string, texto: string) {
  try {
    if (!texto.trim()) {
      return { success: false, error: 'El texto de la subtarea es obligatorio' }
    }

    const count = await prisma.subtarea.count({ where: { tarea_id } })
    const subtarea = await prisma.subtarea.create({
      data: {
        tarea_id,
        texto: texto.trim(),
        completada: false,
        orden: count,
      }
    })

    revalidatePath('/proyectos')
    revalidatePath('/tareas')
    return { success: true, data: subtarea }
  } catch (error) {
    console.error("Error creating subtarea:", error)
    return { success: false, error: 'Ocurrió un error al crear la subtarea' }
  }
}

export async function toggleSubtarea(id: string, completada: boolean, usuarioNombre?: string) {
  try {
    const subtarea = await prisma.subtarea.update({
      where: { id },
      data: { completada },
      include: {
        tarea: {
          include: {
            proyecto: true,
            sprint: true,
            encargados: { select: { nombre: true } },
            subtareas: { orderBy: { createdAt: 'asc' } },
          }
        }
      }
    })

    // Trigger async email notification for subtask toggle
    if (subtarea.tarea) {
      const allSubs = subtarea.tarea.subtareas;
      const total = allSubs.length;
      const completadas = allSubs.filter(s => s.completada).length;
      const author = usuarioNombre || (subtarea.tarea.encargados.length > 0 ? subtarea.tarea.encargados.map(e => e.nombre).join(', ') : 'Usuario de Movida ERP');

      sendSubtaskUpdateNotification({
        taskTitle: subtarea.tarea.titulo,
        subtareaTexto: subtarea.texto,
        subtareaCompletada: completada,
        totalSubtareas: total,
        completadasSubtareas: completadas,
        proyectoNombre: subtarea.tarea.proyecto?.nombre || 'Proyecto General',
        sprintNumero: subtarea.tarea.sprint?.numero,
        sprintNombre: subtarea.tarea.sprint?.nombre,
        usuarioNombre: author,
        allSubtareas: allSubs.map(s => ({ texto: s.texto, completada: s.completada })),
      }).catch(err => console.error('[SMTP Subtask Error]', err));
    }

    revalidatePath('/proyectos')
    revalidatePath('/tareas')
    return { success: true, data: subtarea }
  } catch (error) {
    console.error("Error toggling subtarea:", error)
    return { success: false, error: 'Ocurrió un error al actualizar la subtarea' }
  }
}

export async function deleteSubtarea(id: string) {
  try {
    const subtarea = await prisma.subtarea.delete({
      where: { id }
    })
    revalidatePath('/proyectos')
    revalidatePath('/tareas')
    return { success: true, data: subtarea }
  } catch (error) {
    console.error("Error deleting subtarea:", error)
    return { success: false, error: 'Ocurrió un error al eliminar la subtarea' }
  }
}
