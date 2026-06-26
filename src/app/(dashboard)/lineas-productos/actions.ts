'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getLineasProductos() {
  try {
    const lineas = await prisma.lineaProducto.findMany({
      include: {
        productos: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return { success: true, lineas };
  } catch (error) {
    console.error('Error fetching lineas productos:', error);
    return { success: false, error: 'Error al cargar el catálogo' };
  }
}

export async function createLineaProducto(data: { nombre: string, descripcion?: string }) {
  try {
    const linea = await prisma.lineaProducto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion
      }
    });
    revalidatePath('/lineas-productos');
    return { success: true, linea };
  } catch (error) {
    console.error('Error creating linea producto:', error);
    return { success: false, error: 'Error al crear la línea de producto' };
  }
}

export async function updateLineaProducto(id: string, data: { nombre: string, descripcion?: string, activa?: boolean }) {
  try {
    const linea = await prisma.lineaProducto.update({
      where: { id },
      data
    });
    revalidatePath('/lineas-productos');
    return { success: true, linea };
  } catch (error) {
    console.error('Error updating linea producto:', error);
    return { success: false, error: 'Error al actualizar la línea de producto' };
  }
}

export async function deleteLineaProducto(id: string) {
  try {
    await prisma.lineaProducto.delete({
      where: { id }
    });
    revalidatePath('/lineas-productos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting linea producto:', error);
    return { success: false, error: 'Error al eliminar la línea de producto' };
  }
}

export async function createProductoServicio(data: { nombre: string, descripcion?: string, precio_base?: number, linea_producto_id: string }) {
  try {
    const producto = await prisma.productoServicio.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio_base: data.precio_base,
        linea_producto_id: data.linea_producto_id
      }
    });
    revalidatePath('/lineas-productos');
    return { success: true, producto };
  } catch (error) {
    console.error('Error creating producto servicio:', error);
    return { success: false, error: 'Error al crear el producto/servicio' };
  }
}

export async function updateProductoServicio(id: string, data: { nombre: string, descripcion?: string, precio_base?: number }) {
  try {
    const producto = await prisma.productoServicio.update({
      where: { id },
      data
    });
    revalidatePath('/lineas-productos');
    return { success: true, producto };
  } catch (error) {
    console.error('Error updating producto servicio:', error);
    return { success: false, error: 'Error al actualizar el producto/servicio' };
  }
}

export async function deleteProductoServicio(id: string) {
  try {
    await prisma.productoServicio.delete({
      where: { id }
    });
    revalidatePath('/lineas-productos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting producto servicio:', error);
    return { success: false, error: 'Error al eliminar el producto/servicio' };
  }
}
