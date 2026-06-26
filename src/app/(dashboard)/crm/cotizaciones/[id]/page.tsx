import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CotizacionDetalleClient } from "./CotizacionDetalleClient";

export const dynamic = 'force-dynamic';

export default async function CotizacionPage({ params }: { params: { id: string } }) {
  // Wait for params in Next.js 15+ if needed, but since it's Next.js 14/15 compat we can await it if required. 
  // In Next 15, `params` is a promise.
  const { id } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id },
    include: {
      cliente: true,
      items: {
        include: {
          producto: {
            include: {
              linea_producto: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!cotizacion) {
    notFound();
  }

  // Get the catalog to allow adding items
  const catalog = await prisma.lineaProducto.findMany({
    include: {
      productos: true
    },
    where: { activa: true },
    orderBy: { nombre: 'asc' }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <CotizacionDetalleClient cotizacion={cotizacion as any} catalog={catalog as any} />
    </div>
  );
}
