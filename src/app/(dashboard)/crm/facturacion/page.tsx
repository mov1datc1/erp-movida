import React from "react";
import { prisma } from "@/lib/prisma";
import { FacturacionClient } from "./FacturacionClient";

export const dynamic = 'force-dynamic';

export default async function FacturacionPage() {
  let facturas: any[] = [];
  let clientes: any[] = [];
  let catalog: any[] = [];
  let favoritos: any[] = [];
  try {
    facturas = await prisma.factura.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    });
    clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: 'asc' }
    });
    catalog = await prisma.lineaProducto.findMany({
      include: {
        productos: true
      },
      orderBy: { nombre: 'asc' }
    });
    favoritos = await prisma.transaccionFrecuente.findMany({
      where: { tipo: 'CXC' },
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    console.error("Failed to fetch facturas", e);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FacturacionClient facturas={facturas} clientes={clientes} catalog={catalog} favoritos={favoritos} />
    </div>
  );
}
