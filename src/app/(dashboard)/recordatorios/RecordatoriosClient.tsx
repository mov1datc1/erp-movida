"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Calendar, Trash2, Edit2, ChevronDown, Check, X, Bell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createRecordatorio, updateRecordatorio, deleteRecordatorio } from "@/app/actions/recordatorios";

type Recordatorio = {
  id: string;
  fecha_creacion: Date;
  descripcion: string;
  fecha_recordatorio: Date;
  estatus: "PENDIENTE" | "ENVIADO" | "COMPLETADO";
  tareas_asociadas: { tarea: { id: string; titulo: string } }[];
};

type TareaDropdown = {
  id: string;
  titulo: string;
  estatus: string;
};

export default function RecordatoriosClient({
  initialRecordatorios,
  tareasDisponibles,
}: {
  initialRecordatorios: any[];
  tareasDisponibles: TareaDropdown[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(initialRecordatorios);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [descripcion, setDescripcion] = useState("");
  const [fechaRecordatorio, setFechaRecordatorio] = useState("");
  const [selectedTareas, setSelectedTareas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multiselect State
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTarea, setSearchTarea] = useState("");

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Filters State
  const [filterStart, setFilterStart] = useState(searchParams.get("start") || "");
  const [filterEnd, setFilterEnd] = useState(searchParams.get("end") || "");

  useEffect(() => {
    setRecordatorios(initialRecordatorios);
  }, [initialRecordatorios]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filterStart) params.set("start", filterStart);
    if (filterEnd) params.set("end", filterEnd);
    router.push(`/recordatorios?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    router.push("/recordatorios");
  };

  const openModal = (rec?: Recordatorio) => {
    if (rec) {
      setEditingId(rec.id);
      setDescripcion(rec.descripcion);
      setFechaRecordatorio(format(new Date(rec.fecha_recordatorio), "yyyy-MM-dd'T'HH:mm"));
      setSelectedTareas(rec.tareas_asociadas.map((t) => t.tarea.id));
    } else {
      setEditingId(null);
      setDescripcion("");
      setFechaRecordatorio("");
      setSelectedTareas([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateRecordatorio(editingId, {
          descripcion,
          fecha_recordatorio: new Date(fechaRecordatorio),
          tareas_ids: selectedTareas,
        });
      } else {
        await createRecordatorio({
          descripcion,
          fecha_recordatorio: new Date(fechaRecordatorio),
          tareas_ids: selectedTareas,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Error al guardar el recordatorio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteRecordatorio(id);
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el recordatorio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTareas = tareasDisponibles.filter(t => 
    t.titulo.toLowerCase().includes(searchTarea.toLowerCase())
  );

  const getStatusBadge = (estatus: string) => {
    switch(estatus) {
      case "PENDIENTE": return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pendiente</span>;
      case "ENVIADO": return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">Enviado</span>;
      case "COMPLETADO": return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Completado</span>;
      default: return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{estatus}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Action & Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="date" 
              className="pl-10 pr-4 py-2 w-full sm:w-40 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
            />
          </div>
          <span className="text-slate-400 text-sm">hasta</span>
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="date" 
              className="pl-10 pr-4 py-2 w-full sm:w-40 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={applyFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors flex-1 sm:flex-none"
            >
              Filtrar
            </button>
            {(filterStart || filterEnd) && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex-1 sm:flex-none"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => openModal()}
          className="w-full xl:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Recordatorio</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-medium">Descripción</th>
                <th className="px-6 py-4 font-medium">Fecha Recordatorio</th>
                <th className="px-6 py-4 font-medium">Tareas Asociadas</th>
                <th className="px-6 py-4 font-medium">Estatus</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recordatorios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Bell className="w-8 h-8 text-slate-300" />
                      <p>No se encontraron recordatorios.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recordatorios.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group relative">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 line-clamp-2">{rec.descripcion}</p>
                      <p className="text-xs text-slate-400 mt-1">Creado: {format(new Date(rec.fecha_creacion), "dd MMM yyyy", { locale: es })}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-primary/70" />
                        <span className="font-medium">{format(new Date(rec.fecha_recordatorio), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {rec.tareas_asociadas.length > 0 ? (
                          rec.tareas_asociadas.map(ta => (
                            <span key={ta.tarea.id} className="px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200 truncate max-w-[150px]">
                              {ta.tarea.titulo}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin tareas</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(rec.estatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(rec)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setItemToDelete(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    
                    {/* Inline Delete Confirmation */}
                    {itemToDelete === rec.id && (
                      <td colSpan={5} className="absolute inset-0 z-10 p-0 m-0 border-0 bg-white/95 backdrop-blur-sm">
                        <div className="flex items-center justify-between w-full h-full px-6 py-2 border border-red-100 shadow-inner">
                          <p className="text-red-700 font-medium flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            ¿Eliminar este recordatorio? Esta acción no se puede deshacer.
                          </p>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setItemToDelete(null)}
                              className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              disabled={isSubmitting}
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleDelete(rec.id)}
                              className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingId ? "Editar Recordatorio" : "Nuevo Recordatorio"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Descripción <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                  placeholder="Ej: Seguimiento a la cotización de cliente VIP..."
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Fecha y Hora del Recordatorio <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  required
                  value={fechaRecordatorio}
                  onChange={e => setFechaRecordatorio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Tareas Asociadas - Multiselect */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-medium text-slate-700">Tareas Asociadas</label>
                
                <div 
                  className="w-full min-h-[42px] px-3 py-1.5 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-primary/50 transition-colors flex flex-wrap gap-1.5 items-center justify-between"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <div className="flex flex-wrap gap-1.5 flex-1 items-center">
                    {selectedTareas.length > 0 ? (
                      selectedTareas.map(taskId => {
                        const t = tareasDisponibles.find(td => td.id === taskId);
                        return t ? (
                          <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200">
                            {t.titulo.substring(0, 30)}{t.titulo.length > 30 ? '...' : ''}
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setSelectedTareas(prev => prev.filter(id => id !== taskId)); }}
                              className="ml-1 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-sm text-slate-400 px-1">Seleccionar tareas...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Dropdown Body */}
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <div className="absolute top-[100%] left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      
                      <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-1.5 text-sm outline-none bg-white border border-slate-200 rounded-lg focus:border-primary/50"
                            placeholder="Buscar tarea..."
                            value={searchTarea}
                            onChange={e => setSearchTarea(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                        {filteredTareas.length > 0 ? (
                          filteredTareas.map(item => {
                            const isSelected = selectedTareas.includes(item.id);
                            return (
                              <div 
                                key={item.id} 
                                className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer rounded-lg transition-colors ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedTareas(prev => prev.filter(id => id !== item.id));
                                  } else {
                                    setSelectedTareas(prev => [...prev, item.id]);
                                  }
                                }}
                              >
                                <span className="line-clamp-1 flex-1 pr-2">{item.titulo}</span>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-slate-400">
                            No se encontraron tareas.
                          </div>
                        )}
                      </div>
                      
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {editingId ? "Guardar Cambios" : "Crear Recordatorio"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
