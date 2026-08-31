'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Loader2, Calendar, Trash2, Search, ChevronDown, CheckSquare, Plus } from 'lucide-react';
import { updateTarea, createEncargado, deleteEncargado, createSubtarea, toggleSubtarea, deleteSubtarea } from '@/app/actions/tareas';
import EliminarTareaModal from './EliminarTareaModal';

interface Cliente {
  id: string;
  nombre: string;
}

interface Encargado {
  id: string;
  nombre: string;
}

interface SprintItem {
  id: string;
  numero: number;
  nombre: string;
}

interface Props {
  tareaToEdit: any;
  clientes: Cliente[];
  encargados: Encargado[];
  proyecto_id?: string;
  sprints?: SprintItem[];
}

export default function EditarTareaModal({ tareaToEdit, clientes, encargados, proyecto_id, sprints = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewEncargado, setShowNewEncargado] = useState(false);
  const [isCreatingEncargado, setIsCreatingEncargado] = useState(false);
  const [selectedEncargados, setSelectedEncargados] = useState<string[]>(
    tareaToEdit.encargados.map((e: any) => e.id)
  );
  const [encargadoToDelete, setEncargadoToDelete] = useState<Encargado | null>(null);
  const [isDeletingEncargado, setIsDeletingEncargado] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchCliente, setSearchCliente] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState(tareaToEdit.cliente_id || "");
  const [selectedSprintId, setSelectedSprintId] = useState(tareaToEdit.sprint_id || "");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  const [subtareas, setSubtareas] = useState<Array<{ id: string; texto: string; completada: boolean }>>(
    tareaToEdit.subtareas || []
  );
  const [newSubtareaText, setNewSubtareaText] = useState('');
  const [isAddingSubtarea, setIsAddingSubtarea] = useState(false);

  const handleAddSubtarea = async () => {
    if (!newSubtareaText.trim()) return;
    setIsAddingSubtarea(true);
    const result = await createSubtarea(tareaToEdit.id, newSubtareaText);
    if (result.success && result.data) {
      setSubtareas(prev => [...prev, result.data]);
      setNewSubtareaText('');
    } else {
      setError(result.error || 'Error al agregar subtarea');
    }
    setIsAddingSubtarea(false);
  };

  const handleToggleSubtarea = async (id: string, completada: boolean) => {
    setSubtareas(prev => prev.map(s => s.id === id ? { ...s, completada } : s));
    const result = await toggleSubtarea(id, completada);
    if (!result.success) {
      setSubtareas(prev => prev.map(s => s.id === id ? { ...s, completada: !completada } : s));
      setError(result.error || 'Error al actualizar subtarea');
    }
  };

  const handleDeleteSubtarea = async (id: string) => {
    setSubtareas(prev => prev.filter(s => s.id !== id));
    const result = await deleteSubtarea(id);
    if (!result.success) {
      setError(result.error || 'Error al eliminar subtarea');
    }
  };
  
  const filteredClientes = clientes.filter(c => c.nombre.toLowerCase().includes(searchCliente.toLowerCase()));

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

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const updateData: any = {
      titulo: formData.get('titulo') as string,
      cliente_id: formData.get('cliente_id') as string || null,
      sprint_id: selectedSprintId || null,
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

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
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
                {sprints.length > 0 && (
                  <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 mb-2">
                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                      Sprint Asignado
                    </label>
                    <select
                      value={selectedSprintId}
                      onChange={(e) => setSelectedSprintId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Sin Sprint (General)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          Sprint #{s.numero} - {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    <div className="relative">
                      <input type="hidden" name="cliente_id" value={selectedClienteId} />
                      <div 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg flex justify-between items-center bg-white cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setShowClienteDropdown(!showClienteDropdown)}
                      >
                        <span className={selectedClienteId ? "text-slate-800" : "text-slate-500"}>
                          {selectedClienteId ? clientes.find(c => c.id === selectedClienteId)?.nombre : 'Sin cliente asociado'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                      
                      {showClienteDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowClienteDropdown(false)}></div>
                          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                              <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                  type="text" 
                                  placeholder="Buscar cliente..." 
                                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                  value={searchCliente}
                                  onChange={e => setSearchCliente(e.target.value)}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                              <div 
                                className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer rounded-lg text-slate-500 transition-colors"
                                onClick={() => { setSelectedClienteId(''); setShowClienteDropdown(false); setSearchCliente(''); }}
                              >
                                Sin cliente asociado
                              </div>
                              {filteredClientes.map(c => (
                                <div 
                                  key={c.id} 
                                  className="px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary cursor-pointer rounded-lg transition-colors font-medium text-slate-700"
                                  onClick={() => { setSelectedClienteId(c.id); setShowClienteDropdown(false); setSearchCliente(''); }}
                                >
                                  {c.nombre}
                                </div>
                              ))}
                              {filteredClientes.length === 0 && (
                                <div className="px-3 py-4 text-sm text-center text-slate-400">
                                  No se encontraron clientes
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
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

                  {/* Checklist de Subtareas */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-800">Checklist de Subtareas & Entregables</h3>
                      </div>
                      {subtareas.length > 0 && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {subtareas.filter(s => s.completada).length} / {subtareas.length} ({Math.round((subtareas.filter(s => s.completada).length / subtareas.length) * 100)}%)
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {subtareas.length > 0 && (
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((subtareas.filter(s => s.completada).length / subtareas.length) * 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Subtasks List */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {subtareas.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between group p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200">
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 text-sm font-medium">
                            <input 
                              type="checkbox"
                              checked={sub.completada}
                              onChange={(e) => handleToggleSubtarea(sub.id, e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className={sub.completada ? "line-through text-slate-400 font-normal" : "text-slate-700 font-semibold"}>
                              {sub.texto}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtarea(sub.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar subtarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {subtareas.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                          No hay subtareas registradas aún. Agrega la primera abajo.
                        </p>
                      )}
                    </div>

                    {/* Add subtask input */}
                    <div className="flex gap-2 pt-1">
                      <input 
                        type="text"
                        value={newSubtareaText}
                        onChange={(e) => setNewSubtareaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtarea();
                          }
                        }}
                        placeholder="+ Agregar subtarea o actividad..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtarea}
                        disabled={isAddingSubtarea || !newSubtareaText.trim()}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-1 shrink-0"
                      >
                        {isAddingSubtarea ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-slate-100 mt-6">
                  <EliminarTareaModal
                    tareaId={tareaToEdit.id}
                    tareaTitulo={tareaToEdit.titulo}
                    onDeleted={() => setIsOpen(false)}
                    triggerButton={
                      <button
                        type="button"
                        className="px-4 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar Tarjeta
                      </button>
                    }
                  />

                  <div className="flex gap-3">
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
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
