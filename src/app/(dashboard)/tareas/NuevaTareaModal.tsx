'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Loader2, Calendar, Plus, Trash2 } from 'lucide-react';
import { deleteEncargado } from '@/app/actions/tareas';
import { createTarea, createEncargado } from '@/app/actions/tareas';

interface Cliente {
  id: string;
  nombre: string;
}

interface Encargado {
  id: string;
  nombre: string;
}

interface Props {
  clientes: Cliente[];
  encargados: Encargado[];
  variant?: 'primary' | 'ghost';
  proyecto_id?: string;
}

export default function NuevaTareaModal({ clientes, encargados, variant = 'primary', proyecto_id }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewEncargado, setShowNewEncargado] = useState(false);
  const [isCreatingEncargado, setIsCreatingEncargado] = useState(false);
  const [selectedEncargados, setSelectedEncargados] = useState<string[]>([]);
  const [encargadoToDelete, setEncargadoToDelete] = useState<Encargado | null>(null);
  const [isDeletingEncargado, setIsDeletingEncargado] = useState(false);

  const handleDeleteEncargado = async () => {
    if (!encargadoToDelete) return;
    setIsDeletingEncargado(true);
    const result = await deleteEncargado(encargadoToDelete.id);
    if (result.success) {
      setSelectedEncargados(prev => prev.filter(id => id !== encargadoToDelete.id));
      setEncargadoToDelete(null);
    } else {
      setError(result.error || 'Error al eliminar encargado');
    }
    setIsDeletingEncargado(false);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    // Remove the checkboxes so they don't get sent as is, we append them manually
    formData.delete('encargados');
    selectedEncargados.forEach(id => {
      formData.append('encargados', id);
    });

    const result = await createTarea(formData);
    
    if (result.success) {
      setIsOpen(false);
      setSelectedEncargados([]);
    } else {
      setError(result.error || 'Error desconocido');
    }
    setIsLoading(false);
  };

  const handleCreateEncargado = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCreatingEncargado(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await createEncargado(formData);
    
    if (result.success) {
      setShowNewEncargado(false);
      if (result.data) {
        setSelectedEncargados(prev => [...prev, result.data.id]);
      }
    } else {
      setError(result.error || 'Error creando encargado');
    }
    setIsCreatingEncargado(false);
  };

  const toggleEncargado = (id: string) => {
    setSelectedEncargados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={
          variant === 'primary' 
            ? "bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-primary/20"
            : "w-full py-2 flex items-center justify-center gap-2 text-slate-500 hover:text-primary hover:bg-white border border-dashed border-slate-300 hover:border-primary/50 rounded-lg text-sm font-medium transition-all"
        }
      >
        {variant === 'primary' ? <CheckSquare className="w-5 h-5" /> : <Plus className="w-4 h-4" />}
        {variant === 'primary' ? 'Nueva Tarea' : 'Añadir Tarjeta'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Nueva Tarea
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              {showNewEncargado ? (
                <form onSubmit={handleCreateEncargado} className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <h3 className="text-sm font-bold text-blue-900 mb-3">Añadir Nuevo Encargado (Solo Admin)</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      name="nombre" 
                      required 
                      placeholder="Nombre del responsable"
                      className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewEncargado(false)}
                      className="px-3 py-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={isCreatingEncargado}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {isCreatingEncargado ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                    </button>
                  </div>
                </form>
              ) : null}

              <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-4">
                {proyecto_id && <input type="hidden" name="proyecto_id" value={proyecto_id} />}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Tarea *</label>
                  <input 
                    type="text" 
                    name="titulo" 
                    required 
                    placeholder="Ej. Revisar cotización de cliente"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Proyecto</label>
                    <select 
                      name="cliente_id" 
                      defaultValue={clientes.length === 1 ? clientes[0].id : ""}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                    >
                      <option value="">Sin cliente asociado</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                      <span>Encargados</span>
                      {!showNewEncargado && (
                        <button 
                          type="button" 
                          onClick={() => setShowNewEncargado(true)}
                          className="text-primary hover:underline text-xs"
                        >
                          + Añadir Nuevo
                        </button>
                      )}
                    </label>
                    <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-2 bg-white space-y-1 relative">
                      {encargados.map(e => (
                        <div key={e.id} className="flex items-center justify-between group p-1 hover:bg-slate-50 rounded">
                          <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                            <input 
                              type="checkbox" 
                              checked={selectedEncargados.includes(e.id)}
                              onChange={() => toggleEncargado(e.id)}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            {e.nombre}
                          </label>
                          <button
                            type="button"
                            onClick={() => setEncargadoToDelete(e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Eliminar encargado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {encargados.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No hay encargados registrados</p>
                      )}
                      
                      {/* Confirmation Modal overlay for deleting encargado */}
                      {encargadoToDelete && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10 text-center rounded-lg border border-slate-200">
                          <p className="text-sm font-bold text-slate-800 mb-1">¿Eliminar a {encargadoToDelete.nombre}?</p>
                          <p className="text-xs text-slate-500 mb-3">Esta acción no se puede deshacer.</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEncargadoToDelete(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteEncargado}
                              disabled={isDeletingEncargado}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center gap-1"
                            >
                              {isDeletingEncargado ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí, eliminar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                    <select 
                      name="prioridad" 
                      defaultValue="MEDIA"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select 
                      name="categoria" 
                      defaultValue="OTRO"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                    >
                      <option value="ADMINISTRATIVA">Administrativa</option>
                      <option value="OPERATIVA">Operativa</option>
                      <option value="VENTAS">Ventas</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="date" 
                        name="fecha_limite" 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
                    <textarea 
                      name="descripcion" 
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      placeholder="Detalles sobre la tarea..."
                    ></textarea>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    form="create-task-form"
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Tarea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
