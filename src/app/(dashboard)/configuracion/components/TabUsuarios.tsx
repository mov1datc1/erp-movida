'use client';

import React, { useState } from 'react';
import { Plus, Edit, User, Mail, Shield } from 'lucide-react';
import { createUserWithRole, updateUserRole } from '../actions';

export default function TabUsuarios({ initialUsuarios, roles }: { initialUsuarios: any[], roles: any[] }) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appRoleId, setAppRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (usuario?: any) => {
    if (usuario) {
      setEditingUserId(usuario.id);
      setNombre(usuario.nombre || '');
      setEmail(usuario.email || '');
      setPassword('');
      setAppRoleId(usuario.app_role_id || '');
    } else {
      setEditingUserId(null);
      setNombre('');
      setEmail('');
      setPassword('');
      setAppRoleId('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let res;

    if (editingUserId) {
      res = await updateUserRole(editingUserId, { nombre, app_role_id: appRoleId || null });
    } else {
      res = await createUserWithRole({ email, nombre, app_role_id: appRoleId, password });
    }

    setIsLoading(false);

    if (res.success) {
      setIsModalOpen(false);
      // Simulate refresh
      if (editingUserId) {
        setUsuarios(usuarios.map(u => u.id === editingUserId ? { ...u, nombre, app_role_id: appRoleId, app_role: roles.find(r => r.id === appRoleId) } : u));
      } else {
        // new user (res.data contains the new profile)
        const newUser = res.data;
        if (newUser) {
          const userWithRole = {
            ...newUser,
            app_role: roles.find(r => r.id === newUser.app_role_id)
          };
          setUsuarios([userWithRole, ...usuarios]);
        }
      }
    } else {
      alert('Error al guardar el usuario: ' + res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Control de Usuarios</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usuarios.map(usuario => (
          <div key={usuario.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative group hover:border-primary/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-lg shrink-0">
                {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-800 truncate">{usuario.nombre || 'Sin nombre'}</h3>
                <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5 truncate">
                  <Mail className="w-3 h-3" /> {usuario.email}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                    <Shield className="w-3 h-3" /> 
                    {usuario.app_role?.nombre || 'Sin Rol'}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => handleOpenModal(usuario)}
              className="absolute top-4 right-4 p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        ))}

        {usuarios.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-100">
            No hay usuarios registrados.
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              {!editingUserId && (
                <p className="text-sm text-slate-500 mt-1">El usuario recibirá un correo con sus accesos.</p>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!!editingUserId} // No se permite editar email fácilmente, requiere admin auth api
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="juan@empresa.com"
                  required
                />
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
                  <input 
                    type="text" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Si se deja vacío, se usa TempPassword123!"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asignar Rol</label>
                <select
                  value={appRoleId}
                  onChange={e => setAppRoleId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  required
                >
                  <option value="" disabled>Seleccione un rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
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
                  {isLoading ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
