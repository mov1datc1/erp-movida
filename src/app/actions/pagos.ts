'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function registrarPagoParcialCxC(facturaId: string, data: { monto: number, metodo_pago?: string, referencia?: string, fecha?: Date }) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: { cliente: true }
    });

    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }

    const nuevoMontoPagado = (factura.monto_pagado || 0) + data.monto;
    const nuevoEstatus = nuevoMontoPagado >= factura.monto_total ? 'PAGADA' : 'PAGADA_PARCIALMENTE';

    // 1. Crear el movimiento financiero (Ingreso)
    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: data.fecha || new Date(),
        descripcion: `Pago de Factura/CxC: ${factura.folio} - ${factura.cliente.nombre}`,
        monto: data.monto,
        tipo_flujo: 'OPERATIVO',
        sentido: 'INGRESO',
        origen: 'SISTEMA_FACTURACION',
        categoria_ingreso: factura.categoria || 'Ventas',
        linea_producto_id: factura.linea_producto_id
      }
    });

    // 2. Crear el registro de pago parcial
    await prisma.pagoParcial.create({
      data: {
        monto: data.monto,
        fecha: data.fecha || new Date(),
        metodo_pago: data.metodo_pago,
        referencia: data.referencia,
        factura_id: factura.id,
        movimiento_id: movimiento.id
      }
    });

    // 3. Actualizar la factura
    await prisma.factura.update({
      where: { id: factura.id },
      data: {
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus as any
      }
    });

    revalidatePath('/crm/facturacion');
    revalidatePath('/contable');
    return { success: true };
  } catch (error: any) {
    console.error('Error al registrar pago CxC:', error);
    return { success: false, error: error.message || 'Error al procesar el pago' };
  }
}

export async function registrarPagoParcialCxP(cuentaId: string, data: { monto: number, metodo_pago?: string, referencia?: string, fecha?: Date }) {
  try {
    const cuenta = await prisma.cuentaPorPagar.findUnique({
      where: { id: cuentaId },
      include: { proveedor: true }
    });

    if (!cuenta) {
      return { success: false, error: 'Cuenta por pagar no encontrada' };
    }

    const nuevoMontoPagado = (cuenta.monto_pagado || 0) + data.monto;
    const nuevoEstatus = nuevoMontoPagado >= cuenta.monto_total ? 'PAGADA' : 'PAGADA_PARCIALMENTE';

    // 1. Crear el movimiento financiero (Egreso)
    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        fecha: data.fecha || new Date(),
        descripcion: `Pago a Proveedor/CxP: ${cuenta.folio} - ${cuenta.proveedor.nombre}`,
        monto: data.monto,
        tipo_flujo: 'OPERATIVO',
        sentido: 'EGRESO',
        origen: 'SISTEMA_CXP',
        categoria_egreso: cuenta.categoria || 'Gastos Operativos'
      }
    });

    // 2. Crear el registro de pago parcial
    await prisma.pagoParcial.create({
      data: {
        monto: data.monto,
        fecha: data.fecha || new Date(),
        metodo_pago: data.metodo_pago,
        referencia: data.referencia,
        cuenta_por_pagar_id: cuenta.id,
        movimiento_id: movimiento.id
      }
    });

    // 3. Actualizar la cuenta por pagar
    await prisma.cuentaPorPagar.update({
      where: { id: cuenta.id },
      data: {
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus as any
      }
    });

    revalidatePath('/cuentas-por-pagar');
    revalidatePath('/contable');
    return { success: true };
  } catch (error: any) {
    console.error('Error al registrar pago CxP:', error);
    return { success: false, error: error.message || 'Error al procesar el pago' };
  }
}
