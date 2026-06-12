'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { createAppRole, updateAppRole, deleteAppRole } from '../actions';

const MODULES = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'contable', label: 'Contable' },
  { id: 'crm', label: 'CRM / Clientes' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'facturacion', label: 'Facturación' },
];

export default function TabRoles({ initialRoles }: { initialRoles: any[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setNombre(role.nombre);
      setDescripcion(role.descripcion || '');
      setPermisos(role.permisos ? (Array.isArray(role.permisos) ? role.permisos : JSON.parse(role.permisos as string)) : []);
    } else {
      setEditingRole(null);
      setNombre('');
      setDescripcion('');
      setPermisos([]);
    }
    setIsModalOpen(true);
  };

  const handleTogglePermiso = (modId: string) => {
    if (permisos.includes(modId)) {
      setPermisos(permisos.filter(p => p !== modId));
    } else {
      setPermisos([...permisos, modId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let res;
    if (editingRole) {
      res = await updateAppRole(editingRole.id, { nombre, descripcion, permisos });
    } else {
      res = await createAppRole({ nombre, descripcion, permisos });
    }
    setIsLoading(false);

    if (res.success) {
      setIsModalOpen(false);
      // Simulating a refresh, in a real app server actions might trigger router.refresh() 
      // but we update state locally for immediate feedback
      if (editingRole) {
        setRoles(roles.map(r => r.id === editingRole.id ? res.data : r));
      } else {
        setRoles([res.data, ...roles]);
      }
    } else {
      alert('Error al guardar el rol: ' + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este rol?')) {
      const res = await deleteAppRole(id);
      if (res.success) {
        setRoles(roles.filter(r => r.id !== id));
      } else {
        alert('Error: ' + res.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Roles del Sistema</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Rol
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider">
              <th className="py-3 px-6 font-semibold">Rol</th>
              <th className="py-3 px-6 font-semibold">Descripción</th>
              <th className="py-3 px-6 font-semibold">Módulos Asignados</th>
              <th className="py-3 px-6 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {roles.map(role => (
              <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-4 px-6 text-sm font-semibold text-slate-800">{role.nombre}</td>
                <td className="py-4 px-6 text-sm text-slate-500">{role.descripcion || '-'}</td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(role.permisos) ? role.permisos : []).map((p: string) => (
                      <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md capitalize">
                        {p}
                      </span>
                    ))}
                    {(!role.permisos || role.permisos.length === 0) && (
                      <span className="text-xs text-slate-400 italic">Ninguno</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(role)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(role.id)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">No hay roles registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar Rol */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Rol</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Ej. Gerente de Ventas"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3 mt-4">Módulos Permitidos</label>
                <div className="grid grid-cols-2 gap-3">
                  {MODULES.map(mod => (
                    <label key={mod.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={permisos.includes(mod.id)}
                        onChange={() => handleTogglePermiso(mod.id)}
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-slate-700">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
