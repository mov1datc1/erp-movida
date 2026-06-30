import React from "react";
import { prisma } from "@/lib/prisma";
import NuevaOportunidadBoton from "./NuevaOportunidadBoton";
import KanbanBoard from "./KanbanBoard";

export const dynamic = 'force-dynamic';

export default async function OportunidadesPage() {
  let oportunidades: any[] = [];
  let clientes: any[] = [];
  try {
    oportunidades = await prisma.oportunidad.findMany({
      include: { cliente: true },
      orderBy: { updatedAt: 'desc' }
    });
    clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (e) {
    console.error("Failed to fetch opportunities or clients", e);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Pipeline de Ventas</h1>
          <p className="text-text-muted mt-1">Gestiona tus oportunidades y cierres.</p>
        </div>
        <NuevaOportunidadBoton clientes={clientes} />
      </div>

      {/* KanbanBoard */}
      <KanbanBoard initialOportunidades={oportunidades} clientes={clientes} />
    </div>
  );
}
