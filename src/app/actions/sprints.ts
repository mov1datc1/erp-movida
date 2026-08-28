'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { SprintEstatus, TareaStatus, Prioridad, CategoriaTarea } from "@prisma/client"

export async function generateAISprints({
  proyectoId,
  alcance,
  semanas = 4,
  horasDia = 6,
  diasSemana = 5,
}: {
  proyectoId: string
  alcance: string
  semanas: number
  horasDia: number
  diasSemana: number
}) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { cliente: true }
    })

    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' }
    }

    // Horas totales por sprint (capacidad semanal por dev)
    const horasPorSprint = horasDia * diasSemana

    // Estructuras de Sprints basadas en IA según palabras clave o alcance
    const esPortalAlumno = alcance.toLowerCase().includes('alumno') || alcance.toLowerCase().includes('les rois') || proyecto.nombre.toLowerCase().includes('alumno')

    let sprintTemplates: Array<{
      numero: number
      nombre: string
      objetivo: string
      tareas: Array<{
        titulo: string
        descripcion: string
        prioridad: Prioridad
        categoria: CategoriaTarea
        horas_estimadas: number
        estatus: TareaStatus
      }>
    }> = []

    if (esPortalAlumno) {
      sprintTemplates = [
        {
          numero: 1,
          nombre: "Sprint 1: Autenticación, Roles y Aislamiento de Alumnos",
          objetivo: "Establecer la arquitectura base, esquemas de base de datos Supabase/Prisma y seguridad por Grupos/Niveles.",
          tareas: [
            {
              titulo: "Configurar esquema Prisma & Supabase Auth con Roles (ADMIN / USER / ALUMNO)",
              descripcion: "Modelado de datos en Supabase para aislamiento estricto por nivel educativo.",
              prioridad: "URGENTE",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: "COMPLETADA"
            },
            {
              titulo: "Implementar middleware de RBAC y Login con Google / Email",
              descripcion: "Restricción de rutas y validación de tokens JWT en Next.js App Router.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: "COMPLETADA"
            },
            {
              titulo: "Diseño UI Glassmorphism para Landing & Login de Alumnos",
              descripcion: "Interfaz moderna con animaciones y branding Les Rois.",
              prioridad: "MEDIA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.30),
              estatus: "COMPLETADA"
            }
          ]
        },
        {
          numero: 2,
          nombre: "Sprint 2: Panel de Administración & CRUD de Horarios/Grupos",
          objetivo: "Permitir a los administradores gestionar usuarios, grupos de clase y asignación de horarios en tiempo real.",
          tareas: [
            {
              titulo: "CRUD de Usuarios y Asignación de Niveles Educativos",
              descripcion: "Módulo de gestión masiva de alumnos, profesores y coordinadores.",
              prioridad: "ALTA",
              categoria: "ADMINISTRATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.4),
              estatus: "COMPLETADA"
            },
            {
              titulo: "Gestor de Horarios e Integración de Calendario semanal",
              descripcion: "Vista interactiva de materias, horarios y materias asignadas por alumno.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: "EN_CURSO"
            },
            {
              titulo: "Notificaciones Push/Email para Cambios de Horario",
              descripcion: "Sistema de alertas cuando se reprograma una clase o sesión.",
              prioridad: "MEDIA",
              categoria: "MARKETING",
              horas_estimadas: Math.round(horasPorSprint * 0.25),
              estatus: "PENDIENTE"
            }
          ]
        },
        {
          numero: 3,
          nombre: "Sprint 3: Integración Zoom Server-to-Server OAuth & Clases en Vivo",
          objetivo: "Crear salas virtuales automáticamente y sincronizar credenciales Zoom de forma transparente para los alumnos.",
          tareas: [
            {
              titulo: "Conexión con Zoom API Server-to-Server OAuth",
              descripcion: "Generación segura de Access Tokens y gestión de credenciales del servidor.",
              prioridad: "URGENTE",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.45),
              estatus: "EN_CURSO"
            },
            {
              titulo: "Creación Automática de Reuniones Zoom al agendar clase",
              descripcion: "Webhook e integración backend para instanciar links de Zoom dinámicos.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: "PENDIENTE"
            },
            {
              titulo: "Botonera de Ingreso Directo a Clase en Vivo en Dashboard Alumno",
              descripcion: "UI con temporizador y validación de asistencia automatizada.",
              prioridad: "MEDIA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.2),
              estatus: "PENDIENTE"
            }
          ]
        },
        {
          numero: 4,
          nombre: "Sprint 4: Asistente IA de Aprendizaje & Context Engineering",
          objetivo: "Desplegar el tutor IA con Context Engineering personalizado por plan de estudios y materias del alumno.",
          tareas: [
            {
              titulo: "Motor de Context Engineering con RAG para Material Escolar",
              descripcion: "Indexación de guías docentes y tareas del alumno para respuestas precisas.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.45),
              estatus: "PENDIENTE"
            },
            {
              titulo: "Chat Widget Interactivo con Vercel AI SDK / OpenAI",
              descripcion: "Componente flotante de chat con soporte de markdown, LaTeX y voz.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: "PENDIENTE"
            },
            {
              titulo: "QA, Pruebas de Carga y Despliegue Final en Producción",
              descripcion: "Auditoría de rendimiento, prueba de estrés de Zoom y entrega final.",
              prioridad: "ALTA",
              categoria: "OPERATIVA",
              horas_estimadas: Math.round(horasPorSprint * 0.20),
              estatus: "PENDIENTE"
            }
          ]
        }
      ]
    } else {
      // Plantilla genérica inteligente impulsada por el alcance del usuario
      const partesAlcance = alcance.split('.').filter(p => p.trim().length > 0)
      const numSprints = Math.max(1, Math.min(12, semanas))

      for (let i = 1; i <= numSprints; i++) {
        const parteObjetivo = partesAlcance[i - 1] || `Desarrollo de entregables clave de la fase ${i}`
        
        let nombreSprint = `Sprint ${i}: Fase ${i} - ${parteObjetivo.slice(0, 35)}...`
        if (i === 1) nombreSprint = `Sprint 1: Descubrimiento, Arquitectura & Base de Datos`
        else if (i === numSprints) nombreSprint = `Sprint ${i}: Integración Final, QA & Lanzamiento`

        sprintTemplates.push({
          numero: i,
          nombre: nombreSprint,
          objetivo: `Ejecución de hitos semanal para ${parteObjetivo.trim()}`,
          tareas: [
            {
              titulo: `Módulo Core ${i}.1 - Estructura de APIs y Modelos`,
              descripcion: `Diseño e implementación de lógica de negocio para la semana ${i}.`,
              prioridad: i === 1 ? 'URGENTE' : 'ALTA',
              categoria: 'OPERATIVA',
              horas_estimadas: Math.round(horasPorSprint * 0.4),
              estatus: i === 1 ? 'COMPLETADA' : 'PENDIENTE'
            },
            {
              titulo: `Interfaz de Usuario (UX/UI) ${i}.2 - Componentes Interactivos`,
              descripcion: `Desarrollo frontend con responsive design y animaciones.`,
              prioridad: 'MEDIA',
              categoria: 'OPERATIVA',
              horas_estimadas: Math.round(horasPorSprint * 0.35),
              estatus: i === 1 ? 'EN_CURSO' : 'PENDIENTE'
            },
            {
              titulo: `Pruebas de Calidad & Checkpoint Semanal ${i}.3`,
              descripcion: `Validación de entregables y registro de horas trabajadas.`,
              prioridad: 'MEDIA',
              categoria: 'ADMINISTRATIVA',
              horas_estimadas: Math.round(horasPorSprint * 0.25),
              estatus: 'PENDIENTE'
            }
          ]
        })
      }
    }

    // Limpiar sprints existentes si es un reemplazo completo
    await prisma.sprint.deleteMany({
      where: { proyecto_id: proyectoId }
    })

    // Actualizar configuración de horas del proyecto
    const fechaInicio = proyecto.fecha_inicio || new Date()
    const fechaFin = new Date(fechaInicio.getTime() + semanas * 7 * 24 * 60 * 60 * 1000)

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: {
        descripcion: alcance,
        horas_dia: horasDia,
        dias_semana: diasSemana,
        fecha_fin: fechaFin,
        estado: 'ACTIVO'
      }
    })

    // Crear encargados de demostración si no existen
    const encargadosExistentes = await prisma.encargado.findMany()
    let encargadoIds = encargadosExistentes.map(e => e.id)
    
    if (encargadoIds.length === 0) {
      const dev1 = await prisma.encargado.create({ data: { nombre: 'Jonathan Palacios (Lead Dev)' } })
      const dev2 = await prisma.encargado.create({ data: { nombre: 'Carlos Mendoza (Frontend)' } })
      const dev3 = await prisma.encargado.create({ data: { nombre: 'Ana Rivas (Backend / AI)' } })
      encargadoIds = [dev1.id, dev2.id, dev3.id]
    }

    // Insertar Sprints y sus Tareas
    for (let idx = 0; idx < sprintTemplates.length; idx++) {
      const template = sprintTemplates[idx]
      const inicioSprint = new Date(fechaInicio.getTime() + idx * 7 * 24 * 60 * 60 * 1000)
      const finSprint = new Date(inicioSprint.getTime() + 6 * 24 * 60 * 60 * 1000)

      const horasTotalSprint = template.tareas.reduce((sum, t) => sum + t.horas_estimadas, 0)
      const horasRealesIniciales = template.tareas.filter(t => t.estatus === 'COMPLETADA').reduce((sum, t) => sum + t.horas_estimadas, 0)

      const estatusSprint: SprintEstatus = idx === 0 
        ? (horasRealesIniciales >= horasTotalSprint ? 'COMPLETADO' : 'EN_CURSO')
        : (idx === 1 ? 'EN_CURSO' : 'PLANIFICADO')

      const sprintCreated = await prisma.sprint.create({
        data: {
          proyecto_id: proyectoId,
          numero: template.numero,
          nombre: template.nombre,
          objetivo: template.objetivo,
          fecha_inicio: inicioSprint,
          fecha_fin: finSprint,
          horas_estimadas: horasTotalSprint,
          horas_reales: horasRealesIniciales,
          estatus: estatusSprint,
          checkpoint_completado: estatusSprint === 'COMPLETADO',
          notas_checkpoint: idx === 0 ? "Sprint 1 completado con éxito. Roles y auth aislados correctamente." : null
        }
      })

      // Crear tareas ligadas a este sprint
      for (let tIdx = 0; tIdx < template.tareas.length; tIdx++) {
        const tareaTpl = template.tareas[tIdx]
        const assignedEncargado = encargadoIds[(idx + tIdx) % encargadoIds.length]

        await prisma.tarea.create({
          data: {
            titulo: tareaTpl.titulo,
            descripcion: tareaTpl.descripcion,
            prioridad: tareaTpl.prioridad,
            categoria: tareaTpl.categoria,
            estatus: tareaTpl.estatus,
            horas_estimadas: tareaTpl.horas_estimadas,
            horas_reales: tareaTpl.estatus === 'COMPLETADA' ? tareaTpl.horas_estimadas : (tareaTpl.estatus === 'EN_CURSO' ? Math.round(tareaTpl.horas_estimadas * 0.5) : 0),
            proyecto_id: proyectoId,
            cliente_id: proyecto.cliente_id,
            sprint_id: sprintCreated.id,
            fecha_limite: finSprint,
            orden: tIdx,
            is_focus: tareaTpl.prioridad === 'URGENTE',
            encargados: {
              connect: [{ id: assignedEncargado }]
            }
          }
        })
      }
    }

    revalidatePath('/proyectos')
    revalidatePath(`/proyectos/${proyectoId}`)

    return {
      success: true,
      message: `Plan de ${sprintTemplates.length} sprints generado exitosamente con capacidad de ${horasPorSprint * sprintTemplates.length} hrs totales.`
    }
  } catch (error: any) {
    console.error("Error generating AI sprints:", error)
    return { success: false, error: error.message || 'Error al generar el plan de sprints con IA' }
  }
}

export async function updateSprintCheckpoint({
  sprintId,
  checkpoint_completado,
  notas_checkpoint,
  bloqueos,
  horas_reales,
  estatus
}: {
  sprintId: string
  checkpoint_completado?: boolean
  notas_checkpoint?: string
  bloqueos?: string
  horas_reales?: number
  estatus?: SprintEstatus
}) {
  try {
    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(checkpoint_completado !== undefined && { checkpoint_completado }),
        ...(notas_checkpoint !== undefined && { notas_checkpoint }),
        ...(bloqueos !== undefined && { bloqueos }),
        ...(horas_reales !== undefined && { horas_reales }),
        ...(estatus !== undefined && { estatus }),
      },
      include: { proyecto: true }
    })

    revalidatePath(`/proyectos/${sprint.proyecto_id}`)
    revalidatePath('/proyectos')
    return { success: true, data: sprint }
  } catch (error) {
    console.error("Error updating sprint checkpoint:", error)
    return { success: false, error: 'Error al actualizar el checkpoint del sprint' }
  }
}

export async function seedPortalAlumnoDemo() {
  try {
    let cliente = await prisma.cliente.findFirst({
      where: { nombre: { contains: 'Les Rois', mode: 'insensitive' } }
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: "Instituto Les Rois",
          empresa: "Les Rois Educational Platform",
          email: "contacto@lesrois.edu.mx",
          telefono: "+52 33 1234 5678",
          estatus: "ACTIVO",
          fuente: "Manual"
        }
      })
    }

    let proyecto = await prisma.proyecto.findFirst({
      where: {
        OR: [
          { nombre: { contains: 'Portal del Alumno', mode: 'insensitive' } },
          { nombre: { contains: 'Les Rois', mode: 'insensitive' } }
        ]
      },
      include: { sprints: true }
    })

    if (!proyecto) {
      const nextCodigo = 'PROJ-M901'
      proyecto = await prisma.proyecto.create({
        data: {
          nombre: "Portal del Alumno (Les Rois)",
          codigo: nextCodigo,
          descripcion: "Plataforma educativa con autenticación por grupos, control de horarios, integraciones Zoom Server-to-Server y asistente de aprendizaje IA.",
          cliente_id: cliente.id,
          estado: "ACTIVO",
          fecha_inicio: new Date(),
          fecha_fin: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          horas_dia: 6,
          dias_semana: 5
        },
        include: { sprints: true }
      })
    }

    // Si no tiene sprints, generarlos automáticamente con la IA
    if (proyecto.sprints.length === 0) {
      await generateAISprints({
        proyectoId: proyecto.id,
        alcance: "Portal del Alumno Les Rois: Autenticación con aislamiento de roles/grupos, Panel de administración de usuarios y horarios, Zoom API Server-to-Server OAuth para clases virtuales en vivo, e Inteligencia Artificial con Context Engineering para tutorías personalizadas.",
        semanas: 4,
        horasDia: 6,
        diasSemana: 5
      })
    }

    revalidatePath('/proyectos')
    return { success: true, proyectoId: proyecto.id }
  } catch (error: any) {
    console.error("Error seeding Portal del Alumno:", error)
    return { success: false, error: error.message }
  }
}
