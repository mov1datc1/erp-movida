import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FolderKanban } from "lucide-react";
import ProyectoKanbanBoard from "./ProyectoKanbanBoard";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ proyectoId: string }> | { proyectoId: string };
}

export default async function ProyectoPage({ params }: Props) {
  const resolvedParams = await params;
  const proyectoId = resolvedParams.proyectoId;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      cliente: true,
      sprints: {
        orderBy: { numero: 'asc' },
        include: {
          tareas: {
            include: {
              encargados: true
            }
          }
        }
      },
      tareas: {
        include: {
          encargados: true,
          comentarios: { orderBy: { createdAt: 'desc' } }
        },
        orderBy: { orden: 'asc' }
      }
    }
  });

  if (!proyecto) {
    notFound();
  }

  const encargados = await prisma.encargado.findMany({
    orderBy: { nombre: 'asc' }
  });

  const serializedProyecto = JSON.parse(JSON.stringify(proyecto));
  const serializedTareas = JSON.parse(JSON.stringify(proyecto.tareas));
  const serializedEncargados = JSON.parse(JSON.stringify(encargados));

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/proyectos"
            className="p-2.5 bg-white rounded-2xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {proyecto.codigo || 'PROJ-M'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Cliente: {proyecto.cliente?.nombre || 'Interno'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {proyecto.nombre}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ProyectoKanbanBoard
          proyecto={serializedProyecto}
          initialTareas={serializedTareas}
          encargados={serializedEncargados}
        />
      </div>
    </div>
  );
}
