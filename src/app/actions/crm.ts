'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createCliente(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const empresa = formData.get('empresa') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const rfc_taxid = formData.get('rfc_taxid') as string

    if (!nombre) {
      return { success: false, error: 'El nombre es obligatorio' }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        empresa,
        email,
        telefono,
        rfc_taxid,
        estatus: 'LEAD',
      }
    })

    revalidatePath('/crm/clientes')
    return { success: true, data: cliente }
  } catch (error) {
    console.error("Error creating cliente:", error)
    return { success: false, error: 'Ocurrió un error al crear el cliente' }
  }
}

export async function createOportunidad(formData: FormData) {
  try {
    const titulo = formData.get('titulo') as string
    const valor_estimado = parseFloat(formData.get('valor_estimado') as string)
    const cliente_id = formData.get('cliente_id') as string

    if (!titulo || !cliente_id) {
      return { success: false, error: 'El título y el cliente son obligatorios' }
    }

    const oportunidad = await prisma.oportunidad.create({
      data: {
        titulo,
        valor_estimado: isNaN(valor_estimado) ? 0 : valor_estimado,
        cliente_id,
        etapa: 'PROSPECTO',
      }
    })

    revalidatePath('/crm/oportunidades')
    return { success: true, data: oportunidad }
  } catch (error) {
    console.error("Error creating oportunidad:", error)
    return { success: false, error: 'Ocurrió un error al crear la oportunidad' }
  }
}

export async function updateOportunidadEtapa(id: string, etapa: any) {
  try {
    const oportunidad = await prisma.oportunidad.update({
      where: { id },
      data: { etapa }
    })
    revalidatePath('/crm/oportunidades')
    return { success: true, data: oportunidad }
  } catch (error) {
    console.error("Error updating oportunidad etapa:", error)
    return { success: false, error: 'Ocurrió un error al actualizar la etapa' }
  }
}

export async function createCotizacion(formData: FormData) {
  try {
    const folio = formData.get('folio') as string
    const monto = parseFloat(formData.get('monto') as string)
    const cliente_id = formData.get('cliente_id') as string

    if (!folio || !cliente_id) {
      return { success: false, error: 'El folio y el cliente son obligatorios' }
    }

    const cotizacion = await prisma.cotizacion.create({
      data: {
        folio,
        monto: isNaN(monto) ? 0 : monto,
        cliente_id,
        estatus: 'BORRADOR',
      }
    })

    revalidatePath('/crm/cotizaciones')
    return { success: true, data: cotizacion }
  } catch (error: any) {
    console.error("Error creating cotizacion:", error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Ya existe una cotización con ese folio' }
    }
    return { success: false, error: 'Ocurrió un error al crear la cotización' }
  }
}

export async function deleteCliente(id: string) {
  try {
    await prisma.cliente.delete({
      where: { id }
    })
    revalidatePath('/crm/clientes')
    return { success: true }
  } catch (error) {
    console.error("Error deleting cliente:", error)
    return { success: false, error: 'Ocurrió un error al eliminar el cliente' }
  }
}

export async function updateCliente(id: string, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const empresa = formData.get('empresa') as string
    const email = formData.get('email') as string
    const telefono = formData.get('telefono') as string
    const rfc_taxid = formData.get('rfc_taxid') as string

    if (!nombre) {
      return { success: false, error: 'El nombre es obligatorio' }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        empresa,
        email,
        telefono,
        rfc_taxid,
      }
    })

    revalidatePath('/crm/clientes')
    return { success: true, data: cliente }
  } catch (error) {
    console.error("Error updating cliente:", error)
    return { success: false, error: 'Ocurrió un error al actualizar el cliente' }
  }
}

export async function updateClienteEstatus(id: string, estatus: 'LEAD' | 'ACTIVO' | 'INACTIVO') {
  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: { estatus }
    })
    revalidatePath('/crm/clientes')
    return { success: true, data: cliente }
  } catch (error) {
    console.error("Error updating cliente estatus:", error)
    return { success: false, error: 'Ocurrió un error al cambiar el estatus' }
  }
}
