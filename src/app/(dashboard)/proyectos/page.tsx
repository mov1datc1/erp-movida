import React from "react";
import { prisma } from "@/lib/prisma";
import NuevoProyectoModal from "./NuevoProyectoModal";
import ProyectosGrid from "./ProyectosGrid";

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const proyectos = await prisma.proyecto.findMany({
    include: {
      cliente: true,
      tareas: {
        select: {
          id: true,
          estatus: true,
          fecha_limite: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: 'asc' }
  });

  // Serialize dates for client component
  const serializedProyectos = JSON.parse(JSON.stringify(proyectos));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Proyectos</h1>
          <p className="text-text-muted mt-1">Gestiona los proyectos y accede a sus tableros Kanban de tareas.</p>
        </div>
        <NuevoProyectoModal clientes={clientes} />
      </div>

      <ProyectosGrid proyectos={serializedProyectos} clientes={clientes} />
    </div>
  );
}
