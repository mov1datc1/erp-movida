'use client';

import React, { useState } from 'react';
import { updateTarea, deleteTarea, reorderTareas, toggleFocus } from '@/app/actions/tareas';
import { GripVertical, MoreVertical, Search, CheckSquare, Clock, Edit2, Trash2, MessageSquare, Flame, ChevronUp, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { TareaStatus, Prioridad, CategoriaTarea } from '@prisma/client';
import BitacoraModal from './BitacoraModal';
import EditarTareaModal from './EditarTareaModal';

interface Cliente {
  id: string;
  nombre: string;
}

interface Encargado {
  id: string;
  nombre: string;
}

interface Comentario {
  id: string;
  texto: string;
  createdAt: Date;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: Date | null;
  estatus: TareaStatus;
  prioridad: Prioridad;
  categoria: CategoriaTarea;
  orden: number;
  cliente: Cliente | null;
  encargados: Encargado[];
  comentarios: Comentario[];
  is_focus: boolean;
  createdAt: Date;
}

type SortColumn = 'cliente' | 'createdAt' | 'titulo' | 'encargados' | 'prioridad' | 'estatus' | 'fecha_limite';
type SortDir = 'asc' | 'desc';

interface Props {
  initialTareas: Tarea[];
  clientes: Cliente[];
  encargados: Encargado[];
}

export default function TareasDataGrid({ initialTareas, clientes, encargados }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>(initialTareas);
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("Todas");
  const [filtroResponsable, setFiltroResponsable] = useState<string>("");
  const [filtroTitulo, setFiltroTitulo] = useState<string>("");

  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [boardDraggedTareaId, setBoardDraggedTareaId] = useState<string | null>(null);
  const [tareaForBitacora, setTareaForBitacora] = useState<Tarea | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  const handleNewComentarioOptimistic = (tareaId: string, newComentario: Comentario) => {
    setTareas(prev => prev.map(t => {
      if (t.id === tareaId) {
        return {
          ...t,
          comentarios: [newComentario, ...t.comentarios]
        };
      }
      return t;
    }));
    if (tareaForBitacora?.id === tareaId) {
      setTareaForBitacora({
        ...tareaForBitacora,
        comentarios: [newComentario, ...tareaForBitacora.comentarios]
      });
    }
  };

  const prioridadColors: Record<Prioridad, string> = {
    URGENTE: "text-red-600 font-bold",
    ALTA: "text-orange-600 font-semibold",
    MEDIA: "text-amber-600 font-semibold",
    BAJA: "text-green-600"
  };

  const statusColors: Record<TareaStatus, string> = {
    PENDIENTE: "bg-red-100 text-red-700",
    EN_CURSO: "bg-blue-100 text-blue-700",
    ON_HOLD: "bg-purple-100 text-purple-700",
    COMPLETADA: "bg-green-100 text-green-700",
    CANCELADA: "bg-slate-200 text-slate-700"
  };

  const rowColors: Record<TareaStatus, string> = {
    PENDIENTE: "bg-orange-50/50 hover:bg-orange-50",
    EN_CURSO: "bg-blue-50/50 hover:bg-blue-50",
    ON_HOLD: "bg-purple-50/50 hover:bg-purple-50",
    COMPLETADA: "bg-green-50/50 hover:bg-green-50",
    CANCELADA: "bg-slate-50/50 hover:bg-slate-50"
  };

  const statusLabels: Record<TareaStatus, string> = {
    PENDIENTE: "pendiente",
    EN_CURSO: "en curso",
    ON_HOLD: "on hold",
    COMPLETADA: "completada",
    CANCELADA: "cancelada"
  };

  // Filtrado
  let tareasFiltradas = tareas.filter(t => {
    if (!mostrarFinalizadas && (t.estatus === 'COMPLETADA' || t.estatus === 'CANCELADA')) return false;
    if (filtroPrioridad !== "Todas" && t.prioridad !== filtroPrioridad) return false;
    if (filtroResponsable && !t.encargados.some(e => e.nombre.toLowerCase().includes(filtroResponsable.toLowerCase()))) return false;
    if (filtroTitulo && !t.titulo.toLowerCase().includes(filtroTitulo.toLowerCase())) return false;
    return true;
  });

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else setSortCol(null); // click thrice to reset
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Ordenar por orden manual o fecha (default), o por columna de ordenación
  tareasFiltradas.sort((a, b) => {
    if (!sortCol) return a.orden - b.orden || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    let valA: any, valB: any;
    switch (sortCol) {
      case 'cliente': valA = a.cliente?.nombre || ''; valB = b.cliente?.nombre || ''; break;
      case 'createdAt': valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); break;
      case 'titulo': valA = a.titulo.toLowerCase(); valB = b.titulo.toLowerCase(); break;
      case 'encargados': valA = a.encargados.map(e=>e.nombre).join(', '); valB = b.encargados.map(e=>e.nombre).join(', '); break;
      case 'prioridad': valA = a.prioridad; valB = b.prioridad; break; // Podríamos mapear a peso, pero string fallback es OK
      case 'estatus': valA = a.estatus; valB = b.estatus; break;
      case 'fecha_limite': valA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0; valB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0; break;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const list = [...tareasFiltradas];
    const draggedItem = list[draggedIdx];
    
    list.splice(draggedIdx, 1);
    list.splice(index, 0, draggedItem);

    const updatedOrder = list.map((t, idx) => ({ ...t, orden: idx }));
    
    setTareas(prev => prev.map(t => {
      const found = updatedOrder.find(u => u.id === t.id);
      return found ? found : t;
    }));

    setDraggedIdx(null);

    const payload = updatedOrder.map(t => ({ id: t.id, orden: t.orden }));
    await reorderTareas(payload);
  };

  const handleBoardDragStart = (e: React.DragEvent<HTMLDivElement>, tareaId: string) => {
    setBoardDraggedTareaId(tareaId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBoardDrop = async (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    if (!boardDraggedTareaId) return;

    const tarea = tareas.find(t => t.id === boardDraggedTareaId);
    if (!tarea) return;

    const isUnassigned = columnId === 'unassigned';
    
    setTareas(prev => prev.map(t => {
      if (t.id === boardDraggedTareaId) {
        return {
          ...t,
          encargados: isUnassigned ? [] : encargados.filter(en => en.id === columnId)
        };
      }
      return t;
    }));

    setBoardDraggedTareaId(null);
    await updateTarea(boardDraggedTareaId, { 
      encargadosIds: isUnassigned ? [] : [columnId] 
    });
  };

  const updateStatus = async (tareaId: string, newStatus: TareaStatus) => {
    setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estatus: newStatus } : t));
    await updateTarea(tareaId, { estatus: newStatus });
  };

  const handleToggleFocus = async (tarea: Tarea) => {
    const newVal = !tarea.is_focus;
    setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, is_focus: newVal } : t));
    await toggleFocus(tarea.id, newVal);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setTareas(prev => prev.filter(t => t.id !== id));
      await deleteTarea(id);
    }
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderSortHeader = (label: string, col: SortColumn, className = "") => (
    <th 
      className={`px-4 py-4 font-bold cursor-pointer hover:bg-slate-200 transition-colors ${className}`} 
      onClick={() => handleSort(col)}
      title={`Ordenar por ${label}`}
    >
      <div className="flex items-center gap-1 select-none">
        {label}
        {sortCol === col && (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
        )}
      </div>
    </th>
  );

  const renderCard = (tarea: Tarea) => {
    return (
      <div 
        key={tarea.id}
        draggable
        onDragStart={e => handleBoardDragStart(e, tarea.id)}
        className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-3 relative ${tarea.is_focus ? 'border-l-4 border-l-red-500' : ''}`}
      >
        <div className="flex justify-between items-start gap-2">
           <div className="flex-1">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate" title={tarea.cliente?.nombre || 'Interno'}>
                {tarea.cliente?.nombre || 'Interno'}
             </div>
             <h4 className={`font-bold leading-tight text-sm ${tarea.estatus === 'COMPLETADA' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {tarea.is_focus && <Flame className="w-4 h-4 text-red-500 inline-block mr-1 -mt-1 drop-shadow-md" fill="currentColor" />}
                {tarea.titulo}
             </h4>
           </div>
        </div>

        {tarea.descripcion && (
           <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={tarea.descripcion}>{tarea.descripcion}</p>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="relative">
             <select
               value={tarea.estatus}
               onChange={(e) => updateStatus(tarea.id, e.target.value as TareaStatus)}
               className={`appearance-none text-[10px] font-bold px-2.5 py-1 pr-6 rounded-full cursor-pointer outline-none transition-all ${statusColors[tarea.estatus]}`}
             >
               <option value="PENDIENTE">pendiente</option>
               <option value="EN_CURSO">en curso</option>
               <option value="ON_HOLD">on hold</option>
               <option value="COMPLETADA">completada</option>
               <option value="CANCELADA">cancelada</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-70">
               <ChevronDown className="w-3 h-3" />
             </div>
          </div>
          
          <span className={`text-[10px] font-bold uppercase ${prioridadColors[tarea.prioridad]}`}>
            {tarea.prioridad}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-50">
           <button 
             onClick={() => setTareaForBitacora(tarea)}
             className="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
           >
             <MessageSquare className="w-3.5 h-3.5" />
             <span>Bitácora {tarea.comentarios.length > 0 && `(${tarea.comentarios.length})`}</span>
           </button>

           <div className="flex items-center gap-0.5">
             <button 
               onClick={() => handleToggleFocus(tarea)}
               className={`p-1.5 rounded-md transition-colors ${tarea.is_focus ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
               title={tarea.is_focus ? "Quitar Focus" : "Marcar como Focus"}
             >
               <Flame className="w-3.5 h-3.5" fill={tarea.is_focus ? "currentColor" : "none"} />
             </button>
             <EditarTareaModal 
               tareaToEdit={tarea} 
               clientes={clientes} 
               encargados={encargados} 
             />
             <button 
               onClick={() => handleDelete(tarea.id)}
               className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
               title="Eliminar"
             >
               <Trash2 className="w-3.5 h-3.5" />
             </button>
           </div>
        </div>
      </div>
    );
  };

  const renderBoard = () => {
    const columnas = [{ id: 'unassigned', nombre: 'Sin Asignar' }, ...encargados];
    const pesosPrioridad: Record<Prioridad, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };

    return (
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x">
        {columnas.map(col => {
          const colTareas = tareasFiltradas.filter(t => {
            if (col.id === 'unassigned') return t.encargados.length === 0;
            return t.encargados.some(e => e.id === col.id);
          }).sort((a, b) => pesosPrioridad[b.prioridad] - pesosPrioridad[a.prioridad]);

          if (colTareas.length === 0 && col.id === 'unassigned') return null; // hide unassigned if empty

          return (
            <div key={col.id} 
                 className="min-w-[320px] w-[320px] max-w-[320px] shrink-0 bg-slate-100/70 rounded-2xl p-4 flex flex-col snap-start border border-slate-200 shadow-sm"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => handleBoardDrop(e, col.id)}>
               <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between px-1">
                  {col.nombre}
                  <span className="bg-white text-slate-600 shadow-sm font-semibold text-xs py-0.5 px-2.5 rounded-full">{colTareas.length}</span>
               </h3>
               <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[150px]">
                  {colTareas.map(tarea => renderCard(tarea))}
                  {colTareas.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl h-[100px] pointer-events-none">
                      Arrastra tareas aquí
                    </div>
                  )}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <button
          onClick={() => setMostrarFinalizadas(!mostrarFinalizadas)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mostrarFinalizadas ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {mostrarFinalizadas ? "Ocultar Finalizadas" : "Ver Finalizadas"}
        </button>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('table')} 
            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            title="Vista de Tabla"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('board')} 
            className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            title="Vista Kanban (Tarjetas)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="Todas">Todas las prioridades</option>
          <option value="URGENTE">Urgente</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Responsable..."
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Título de la tarea..."
            value={filtroTitulo}
            onChange={(e) => setFiltroTitulo(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* Vistas */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 bg-slate-50 uppercase text-xs tracking-wider">
                  <th className="px-4 py-4 w-8"></th>
                  {renderSortHeader('PROYECTO', 'cliente')}
                  {renderSortHeader('FECHA', 'createdAt')}
                  {renderSortHeader('DESCRIPCIÓN', 'titulo', 'min-w-[250px]')}
                  {renderSortHeader('ENCARGADO', 'encargados')}
                  {renderSortHeader('PRIORIDAD', 'prioridad')}
                  {renderSortHeader('ESTADO', 'estatus')}
                  {renderSortHeader('FECHA LÍMITE', 'fecha_limite')}
                  <th className="px-4 py-4 font-bold min-w-[250px]">NOTAS</th>
                  <th className="px-4 py-4 font-bold text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tareasFiltradas.map((tarea, index) => {
                  const rowBg = rowColors[tarea.estatus];
                  const latestNote = tarea.comentarios.length > 0 ? tarea.comentarios[0].texto : tarea.descripcion;

                  return (
                    <tr 
                      key={tarea.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`${rowBg} ${tarea.is_focus ? 'border-l-4 border-l-red-500 relative' : ''} transition-colors group cursor-grab active:cursor-grabbing align-top`}
                    >
                      <td className="px-4 py-4 text-slate-300">
                        <GripVertical className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700 max-w-[120px] truncate" title={tarea.cliente?.nombre || 'Interno'}>
                        {tarea.cliente?.nombre || 'Interno'}
                      </td>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                        {formatDateShort(tarea.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className={`font-bold ${tarea.estatus === 'COMPLETADA' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {tarea.is_focus && <Flame className="w-4 h-4 text-red-500 inline-block mr-1 -mt-1 drop-shadow-md" fill="currentColor" />}
                            {tarea.titulo}
                          </span>
                          {tarea.descripcion && (
                            <span className="text-xs text-slate-500 mt-1 line-clamp-2" title={tarea.descripcion}>
                              {tarea.descripcion}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {tarea.encargados.length > 0 
                          ? tarea.encargados.map(e => e.nombre).join(' y ') 
                          : '-'}
                      </td>
                      <td className={`px-4 py-4 ${prioridadColors[tarea.prioridad]}`}>
                        {tarea.prioridad.charAt(0) + tarea.prioridad.slice(1).toLowerCase()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative inline-block">
                          <select
                            value={tarea.estatus}
                            onChange={(e) => updateStatus(tarea.id, e.target.value as TareaStatus)}
                            className={`appearance-none text-xs font-bold px-3 py-1.5 pr-6 rounded-full cursor-pointer outline-none transition-all ${statusColors[tarea.estatus]}`}
                          >
                            <option value="PENDIENTE">pendiente</option>
                            <option value="EN_CURSO">en curso</option>
                            <option value="ON_HOLD">on hold</option>
                            <option value="COMPLETADA">completada</option>
                            <option value="CANCELADA">cancelada</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                        {tarea.fecha_limite ? formatDateShort(tarea.fecha_limite) : '-'}
                      </td>
                      <td className="px-4 py-4 max-w-[250px]">
                        <div className="flex flex-col items-start gap-1">
                          <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed" title={latestNote || ''}>
                            {latestNote || 'Sin notas'}
                          </div>
                          <button 
                            onClick={() => setTareaForBitacora(tarea)}
                            className="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary-light flex items-center gap-1 mt-1 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Bitácora {tarea.comentarios.length > 0 && `(${tarea.comentarios.length})`}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleToggleFocus(tarea)}
                            className={`p-1.5 rounded-lg transition-colors ${tarea.is_focus ? 'text-red-500 bg-red-100 hover:bg-red-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                            title={tarea.is_focus ? "Quitar Focus" : "Marcar como Focus"}
                          >
                            <Flame className="w-4 h-4" fill={tarea.is_focus ? "currentColor" : "none"} />
                          </button>
                          <EditarTareaModal 
                            tareaToEdit={tarea} 
                            clientes={clientes} 
                            encargados={encargados} 
                          />
                          <button 
                            onClick={() => handleDelete(tarea.id)}
                            className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tareasFiltradas.length === 0 && (
              <div className="p-12 text-center border-t border-slate-100 bg-white text-slate-500">
                No se encontraron tareas con los filtros actuales.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {renderBoard()}
        </div>
      )}

      {tareaForBitacora && (
        <BitacoraModal 
          tarea={tareaForBitacora} 
          onClose={() => setTareaForBitacora(null)} 
          onAddOptimistic={handleNewComentarioOptimistic}
        />
      )}
    </div>
  );
}
