import React from "react";
import { Users, Plus, Search, MoreVertical, Building2, Phone, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import NuevoClienteBoton from "./NuevoClienteBoton";
import ClienteRowActions from "./ClienteRowActions";

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  // We will handle the timeout gracefully in case DB is unreachable
  let clientes = [];
  try {
    clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    console.error("Failed to fetch clients", e);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Directorio de Clientes</h1>
          <p className="text-text-muted mt-1">Gestiona tus leads y clientes activos.</p>
        </div>
        <NuevoClienteBoton />
      </div>

      <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o empresa..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Contacto</th>
                <th className="px-6 py-4 font-semibold">Estatus</th>
                <th className="px-6 py-4 font-semibold">Registro</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                          {cliente.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-text-main group-hover:text-primary transition-colors">{cliente.nombre}</p>
                          <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {cliente.empresa || "Sin empresa"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{cliente.email || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{cliente.telefono || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        cliente.estatus === 'ACTIVO' ? 'bg-success/10 text-success' :
                        cliente.estatus === 'LEAD' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {cliente.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(cliente.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ClienteRowActions cliente={cliente} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-text-main">No hay clientes registrados</p>
                    <p className="text-sm mt-1">Comienza agregando tu primer cliente o prospecto.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
