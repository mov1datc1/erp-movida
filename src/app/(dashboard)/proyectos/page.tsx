import React from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FolderKanban, Clock, AlertCircle } from "lucide-react";
import NuevoProyectoModal from "./NuevoProyectoModal";

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  // Fetch Proyectos
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Proyectos</h1>
          <p className="text-text-muted mt-1">Gestiona los proyectos y accede a sus tableros Kanban de tareas.</p>
        </div>
        <NuevoProyectoModal clientes={clientes} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {proyectos.map((proyecto) => {
          const totalTareas = proyecto.tareas.length;
          const tareasPendientes = proyecto.tareas.filter(t => t.estatus !== 'COMPLETADA' && t.estatus !== 'CANCELADA').length;
          const tareasVencidas = proyecto.tareas.filter(t => 
            t.fecha_limite && 
            t.estatus !== 'COMPLETADA' && 
            t.estatus !== 'CANCELADA' && 
            new Date(t.fecha_limite).getTime() < new Date().getTime()
          ).length;

          return (
            <Link href={`/proyectos/${proyecto.id}`} key={proyecto.id} className="block group">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                
                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      proyecto.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' : 
                      proyecto.estado === 'ACTIVO' ? 'bg-blue-100 text-blue-700' : 
                      proyecto.estado === 'PLANIFICACION' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {proyecto.estado}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors line-clamp-2" title={proyecto.nombre}>
                    {proyecto.nombre}
                  </h3>
                  
                  <div className="text-sm font-semibold text-slate-500 mb-auto mt-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block w-fit">
                    {proyecto.cliente?.nombre || 'Interno'}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                        <Clock className="w-3.5 h-3.5" /> Pendientes
                      </div>
                      <div className="text-xl font-bold text-slate-700">{tareasPendientes}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Vencidas
                      </div>
                      <div className="text-xl font-bold text-red-600">{tareasVencidas}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {proyectos.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-2">No hay proyectos registrados</h3>
            <p className="text-slate-500 mb-6">Comienza creando un nuevo proyecto para organizar sus tareas asociadas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
