"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRecordatorios(fechaInicio?: Date, fechaFin?: Date) {
  try {
    const where: any = {};
    if (fechaInicio && fechaFin) {
      where.fecha_recordatorio = {
        gte: fechaInicio,
        lte: fechaFin,
      };
    } else if (fechaInicio) {
      where.fecha_recordatorio = {
        gte: fechaInicio,
      };
    } else if (fechaFin) {
      where.fecha_recordatorio = {
        lte: fechaFin,
      };
    }

    const recordatorios = await prisma.recordatorio.findMany({
      where,
      orderBy: { fecha_recordatorio: "asc" },
      include: {
        tareas_asociadas: {
          include: {
            tarea: true,
          },
        },
      },
    });

    return recordatorios;
  } catch (error) {
    console.error("Error obteniendo recordatorios:", error);
    throw new Error("No se pudieron cargar los recordatorios");
  }
}

export async function createRecordatorio(data: {
  descripcion: string;
  fecha_recordatorio: Date;
  tareas_ids: string[];
}) {
  try {
    const recordatorio = await prisma.recordatorio.create({
      data: {
        descripcion: data.descripcion,
        fecha_recordatorio: data.fecha_recordatorio,
        tareas_asociadas: {
          create: data.tareas_ids.map((id) => ({
            tarea_id: id,
          })),
        },
      },
    });
    
    revalidatePath("/recordatorios");
    return recordatorio;
  } catch (error) {
    console.error("Error creando recordatorio:", error);
    throw new Error("No se pudo crear el recordatorio");
  }
}

export async function updateRecordatorio(
  id: string,
  data: {
    descripcion: string;
    fecha_recordatorio: Date;
    tareas_ids: string[];
    estatus?: "PENDIENTE" | "ENVIADO" | "COMPLETADO";
  }
) {
  try {
    // Delete existing associations
    await prisma.tareaRecordatorio.deleteMany({
      where: { recordatorio_id: id },
    });

    const recordatorio = await prisma.recordatorio.update({
      where: { id },
      data: {
        descripcion: data.descripcion,
        fecha_recordatorio: data.fecha_recordatorio,
        estatus: data.estatus,
        tareas_asociadas: {
          create: data.tareas_ids.map((tid) => ({
            tarea_id: tid,
          })),
        },
      },
    });

    revalidatePath("/recordatorios");
    return recordatorio;
  } catch (error) {
    console.error("Error actualizando recordatorio:", error);
    throw new Error("No se pudo actualizar el recordatorio");
  }
}

export async function deleteRecordatorio(id: string) {
  try {
    await prisma.recordatorio.delete({
      where: { id },
    });
    revalidatePath("/recordatorios");
    return { success: true };
  } catch (error) {
    console.error("Error eliminando recordatorio:", error);
    throw new Error("No se pudo eliminar el recordatorio");
  }
}

export async function getTareasParaDropdown() {
  try {
    const tareas = await prisma.tarea.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titulo: true,
        estatus: true,
      },
    });
    return tareas;
  } catch (error) {
    console.error("Error fetching tasks for dropdown", error);
    return [];
  }
}
