import React from "react";
import { prisma } from "@/lib/prisma";
import NuevoProyectoModal from "./NuevoProyectoModal";
import ProyectosGrid from "./ProyectosGrid";
import { seedPortalAlumnoDemo } from "@/app/actions/sprints";
import SeedPortalAlumnoButton from "./SeedPortalAlumnoButton";

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  // Asegurar que exista el proyecto Portal del Alumno (Les Rois) con sus Sprints IA para la demostración
  await seedPortalAlumnoDemo();

  const proyectos = await prisma.proyecto.findMany({
    include: {
      cliente: true,
      sprints: {
        orderBy: { numero: 'asc' },
        include: {
          tareas: {
            select: { id: true, estatus: true }
          }
        }
      },
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

  const serializedProyectos = JSON.parse(JSON.stringify(proyectos));
  const serializedClientes = JSON.parse(JSON.stringify(clientes));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Proyectos & Sprints IA</h1>
          <p className="text-slate-500 mt-1">
            Gestión de tableros Kanban, seguimiento de Sprints semanales con checkpoints de desarrollado e informes ejecutivos para Product Owners.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeedPortalAlumnoButton />
          <NuevoProyectoModal clientes={serializedClientes} />
        </div>
      </div>

      <ProyectosGrid proyectos={serializedProyectos} clientes={serializedClientes} />
    </div>
  );
}
