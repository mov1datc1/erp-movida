'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckSquare, Square, Shield } from 'lucide-react';
import { createAppRole, updateAppRole, deleteAppRole } from '../actions';
import { ALL_MODULES, RolePermissions, parsePermissions } from '@/lib/rbac';

export default function TabRoles({ initialRoles }: { initialRoles: any[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // permisos es un objeto { modulo: { ver, crear, editar, eliminar } }
  const [permisos, setPermisos] = useState<RolePermissions>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setNombre(role.nombre);
      setDescripcion(role.descripcion || '');
      setPermisos(parsePermissions(role.permisos));
    } else {
      setEditingRole(null);
      setNombre('');
      setDescripcion('');
      setPermisos({});
    }
    setIsModalOpen(true);
  };

  const handleTogglePermiso = (modId: string, action: 'ver' | 'crear' | 'editar' | 'eliminar') => {
    setPermisos(prev => {
      const currentModPerms = prev[modId] || { ver: false, crear: false, editar: false, eliminar: false };
      const newValue = !currentModPerms[action];
      
      const newModPerms = { ...currentModPerms, [action]: newValue };
      
      // Si se activa cualquier accion, 'ver' deberia activarse automaticamente
      if (newValue && action !== 'ver') {
        newModPerms.ver = true;
      }
      
      // Si se desactiva 'ver', se desactivan todas las demas
      if (!newValue && action === 'ver') {
        newModPerms.crear = false;
        newModPerms.editar = false;
        newModPerms.eliminar = false;
      }

      return { ...prev, [modId]: newModPerms };
    });
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
      if (editingRole) {
        setRoles(roles.map(r => r.id === editingRole.id ? res.data : r));
      } else {
        setRoles([res.data, ...roles]);
      }
    } else {
      alert('Error al guardar el rol: ' + res.error);
    }
  };

  const handleDelete = async (id: string, roleName: string) => {
    if (roleName === 'Admin' || roleName === 'Super Admin') {
      alert('No puedes eliminar un rol reservado del sistema.');
      return;
    }
    
    if (confirm('¿Estás seguro de eliminar este rol? Los usuarios con este rol perderán sus accesos.')) {
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
              <th className="py-3 px-6 font-semibold">Módulos (Permisos)</th>
              <th className="py-3 px-6 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {roles.map(role => {
              const rolePerms = parsePermissions(role.permisos);
              const activeModules = Object.keys(rolePerms).filter(k => rolePerms[k]?.ver);
              
              return (
                <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 text-sm font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      {role.nombre === 'Admin' && <Shield className="w-4 h-4 text-primary" />}
                      {role.nombre}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">{role.descripcion || '-'}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {activeModules.length > 0 ? activeModules.map((p: string) => (
                        <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md capitalize flex items-center gap-1">
                          {p}
                          {rolePerms[p].crear && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Crear" />}
                          {rolePerms[p].editar && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Editar" />}
                          {rolePerms[p].eliminar && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Eliminar" />}
                        </span>
                      )) : (
                        <span className="text-xs text-slate-400 italic">Ningún acceso</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenModal(role)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(role.id, role.nombre)} 
                        className={`p-1.5 rounded-lg transition-colors ${
                          role.nombre === 'Admin' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-danger hover:bg-danger/10'
                        }`}
                        disabled={role.nombre === 'Admin'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              {editingRole?.nombre === 'Admin' && (
                <p className="text-sm text-primary mt-1 flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Este es un rol reservado del sistema.
                </p>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Rol</label>
                    <input 
                      type="text" 
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      disabled={editingRole?.nombre === 'Admin'}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-50"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3 mt-4">Permisos Granulares</label>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2 px-4 font-semibold">Módulo</th>
                          <th className="py-2 px-4 text-center font-semibold">Ver</th>
                          <th className="py-2 px-4 text-center font-semibold">Crear</th>
                          <th className="py-2 px-4 text-center font-semibold">Editar</th>
                          <th className="py-2 px-4 text-center font-semibold">Eliminar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ALL_MODULES.map(mod => {
                          const modPerms = permisos[mod.id] || { ver: false, crear: false, editar: false, eliminar: false };
                          return (
                            <tr key={mod.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-4 font-medium text-slate-700">{mod.label}</td>
                              <td className="py-2 px-4 text-center">
                                <button type="button" onClick={() => handleTogglePermiso(mod.id, 'ver')} className={`inline-flex ${modPerms.ver ? 'text-primary' : 'text-slate-300'}`}>
                                  {modPerms.ver ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button type="button" onClick={() => handleTogglePermiso(mod.id, 'crear')} className={`inline-flex ${modPerms.crear ? 'text-blue-500' : 'text-slate-300'}`}>
                                  {modPerms.crear ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button type="button" onClick={() => handleTogglePermiso(mod.id, 'editar')} className={`inline-flex ${modPerms.editar ? 'text-amber-500' : 'text-slate-300'}`}>
                                  {modPerms.editar ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button type="button" onClick={() => handleTogglePermiso(mod.id, 'eliminar')} className={`inline-flex ${modPerms.eliminar ? 'text-red-500' : 'text-slate-300'}`}>
                                  {modPerms.eliminar ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex-shrink-0 flex gap-3 justify-end bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || !nombre.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors"
              >
                {isLoading ? 'Guardando...' : 'Guardar Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
