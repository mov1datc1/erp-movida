import React from "react";
import { prisma } from "@/lib/prisma";
import NuevaTareaModal from "./NuevaTareaModal";
import TareasDataGrid from "./TareasDataGrid";

export const dynamic = 'force-dynamic';

export default async function TareasPage() {
  let tareas: any[] = [];
  let clientes: any[] = [];
  let encargados: any[] = [];

  try {
    tareas = await prisma.tarea.findMany({
      where: { proyecto_id: null },
      include: {
        cliente: { select: { id: true, nombre: true } },
        encargados: { select: { id: true, nombre: true } },
        comentarios: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    clientes = await prisma.cliente.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' }
    });

    encargados = await prisma.encargado.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (e) {
    console.error("Failed to fetch tareas data", e);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Gestor de Tareas</h1>
          <p className="text-text-muted mt-1">Organiza tu día, agrupa por proyecto y asigna prioridades.</p>
        </div>
        <NuevaTareaModal clientes={clientes} encargados={encargados} />
      </div>

      <TareasDataGrid 
        initialTareas={tareas} 
        clientes={clientes} 
        encargados={encargados} 
      />
    </div>
  );
}
