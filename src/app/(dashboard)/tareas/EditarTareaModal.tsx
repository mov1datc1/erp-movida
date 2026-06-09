'use client';

import React, { useState } from 'react';
import { X, Edit2, Loader2, Calendar } from 'lucide-react';
import { updateTarea, createEncargado } from '@/app/actions/tareas';

interface Cliente {
  id: string;
  nombre: string;
}

interface Encargado {
  id: string;
  nombre: string;
}

interface Props {
  tareaToEdit: any;
  clientes: Cliente[];
  encargados: Encargado[];
  proyecto_id?: string;
}

export default function EditarTareaModal({ tareaToEdit, clientes, encargados, proyecto_id }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewEncargado, setShowNewEncargado] = useState(false);
  const [isCreatingEncargado, setIsCreatingEncargado] = useState(false);
  const [selectedEncargados, setSelectedEncargados] = useState<string[]>(
    tareaToEdit.encargados.map((e: any) => e.id)
  );

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const updateData: any = {
      titulo: formData.get('titulo') as string,
      cliente_id: formData.get('cliente_id') as string || null,
      prioridad: formData.get('prioridad') as string,
      categoria: formData.get('categoria') as string,
      fecha_limite: formData.get('fecha_limite') ? new Date(formData.get('fecha_limite') as string) : null,
      descripcion: formData.get('descripcion') as string,
      encargadosIds: selectedEncargados
    };

    const result = await updateTarea(tareaToEdit.id, updateData);
    
    if (result.success) {
      setIsOpen(false);
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
        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
        title="Editar"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Editar Tarea
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

              <form id="edit-task-form" onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Tarea *</label>
                  <input 
                    type="text" 
                    name="titulo" 
                    required 
                    defaultValue={tareaToEdit.titulo}
                    placeholder="Ej. Revisar cotización de cliente"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Proyecto</label>
                    <select 
                      name="cliente_id" 
                      defaultValue={tareaToEdit.cliente?.id || ""}
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
                    <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-2 bg-white space-y-1">
                      {encargados.map(e => (
                        <label key={e.id} className="flex items-center gap-2 text-sm p-1 hover:bg-slate-50 cursor-pointer rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedEncargados.includes(e.id)}
                            onChange={() => toggleEncargado(e.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          {e.nombre}
                        </label>
                      ))}
                      {encargados.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No hay encargados registrados</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                    <select 
                      name="prioridad" 
                      defaultValue={tareaToEdit.prioridad}
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
                      defaultValue={tareaToEdit.categoria}
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
                        defaultValue={tareaToEdit.fecha_limite ? new Date(tareaToEdit.fecha_limite).toISOString().split('T')[0] : ''}
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
                      defaultValue={tareaToEdit.descripcion || ''}
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
                    form="edit-task-form"
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
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
