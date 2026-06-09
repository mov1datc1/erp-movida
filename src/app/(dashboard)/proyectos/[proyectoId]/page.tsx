import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProyectoKanbanBoard from "./ProyectoKanbanBoard";

export const dynamic = 'force-dynamic';

interface Props {
  params: { proyectoId: string };
}

export default async function ProyectoPage({ params }: Props) {
  const { proyectoId } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      cliente: true,
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

  // Obtenemos todos los encargados para poder crear/editar tareas desde el Kanban
  const encargados = await prisma.encargado.findMany({
    orderBy: { nombre: 'asc' }
  });

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 shrink-0">
        <Link 
          href="/proyectos" 
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Proyecto: {proyecto.nombre}</h1>
          <p className="text-text-muted mt-1">Kanban interactivo. Cliente asociado: {proyecto.cliente?.nombre || 'Interno'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ProyectoKanbanBoard 
          proyecto={proyecto} 
          initialTareas={proyecto.tareas} 
          encargados={encargados}
        />
      </div>
    </div>
  );
}
