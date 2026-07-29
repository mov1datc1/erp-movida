'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Clock,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { deleteProyecto, updateProyecto } from '@/app/actions/proyectos';

interface Tarea {
  id: string;
  estatus: string;
  fecha_limite: string | Date | null;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
  estado: string;
  fecha_inicio: string | Date | null;
  fecha_fin: string | Date | null;
  cliente_id: string | null;
  cliente: Cliente | null;
  tareas: Tarea[];
}

interface Props {
  proyectos: Proyecto[];
  clientes: Cliente[];
}

// ─── Premium Delete Confirmation Modal ───────────────────────────────
function DeleteConfirmModal({
  proyecto,
  onClose,
  onConfirm,
}: {
  proyecto: Proyecto;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const projectName = proyecto.nombre;
  const isConfirmed = confirmText === projectName;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDelete = async () => {
    if (!isConfirmed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setIsDeleting(true);
    onConfirm();
  };

  const totalTareas = proyecto.tareas.length;
  const tareasActivas = proyecto.tareas.filter(
    (t) => t.estatus !== 'COMPLETADA' && t.estatus !== 'CANCELADA'
  ).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Overlay with red tint */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden ${
          shake ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Danger header band */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-6 py-5 overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-white/5 rounded-full" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Eliminar Proyecto
              </h3>
              <p className="text-red-100 text-sm">
                Esta acción es permanente e irreversible
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Impact warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-800 mb-2">
                  Se eliminarán permanentemente:
                </p>
                <ul className="space-y-1.5 text-red-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    El proyecto{' '}
                    <span className="font-bold">&ldquo;{projectName}&rdquo;</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    Todos sus hitos asociados
                  </li>
                  {totalTareas > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Se desvincularán{' '}
                      <span className="font-bold">{totalTareas} tarea(s)</span>
                      {tareasActivas > 0 && (
                        <span className="text-red-500 font-semibold">
                          ({tareasActivas} activa{tareasActivas > 1 ? 's' : ''})
                        </span>
                      )}
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    Se desvincularán movimientos y cotizaciones
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Type to confirm */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Escribe{' '}
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-red-600 text-xs font-bold border border-slate-200">
                {projectName}
              </span>{' '}
              para confirmar:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={projectName}
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all text-sm font-medium ${
                confirmText.length === 0
                  ? 'border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100'
                  : isConfirmed
                  ? 'border-red-500 bg-red-50/50 text-red-700 ring-2 ring-red-100'
                  : 'border-amber-300 bg-amber-50/30 text-amber-700'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed) handleDelete();
              }}
            />
            {confirmText.length > 0 && !isConfirmed && (
              <p className="text-amber-600 text-xs mt-1.5 font-medium">
                El texto no coincide con el nombre del proyecto
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-200 ${
                isConfirmed
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar Proyecto
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}

// ─── Edit Project Modal ──────────────────────────────────────────────
function EditProyectoModal({
  proyecto,
  clientes,
  onClose,
}: {
  proyecto: Proyecto;
  clientes: Cliente[];
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (d: string | Date | null): string => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const nombre = form.get('nombre') as string;
    const codigo = form.get('codigo') as string | null;
    const descripcion = form.get('descripcion') as string | null;
    const cliente_id = form.get('cliente_id') as string;
    const estado = form.get('estado') as string;
    const fecha_inicio = form.get('fecha_inicio') as string | null;
    const fecha_fin = form.get('fecha_fin') as string | null;

    if (!nombre || !cliente_id) {
      setError('El nombre y el cliente son obligatorios');
      setIsLoading(false);
      return;
    }

    const result = await updateProyecto(proyecto.id, {
      nombre,
      codigo: codigo ? codigo.toUpperCase().trim() : null,
      descripcion: descripcion || null,
      cliente_id,
      estado,
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
      fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Error al actualizar el proyecto');
    }
    setIsLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Proyecto
          </h2>
          <button
            onClick={onClose}
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

          <form id="edit-proyecto-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  defaultValue={proyecto.nombre}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  name="codigo"
                  defaultValue={proyecto.codigo || ''}
                  placeholder="Ej. PRJ-001"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente Asociado *
                </label>
                <select
                  name="cliente_id"
                  required
                  defaultValue={proyecto.cliente_id || ''}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                >
                  <option value="" disabled>
                    Seleccionar un cliente...
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  name="estado"
                  defaultValue={proyecto.estado}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none bg-white"
                >
                  <option value="PLANIFICACION">Planificación</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="COMPLETADO">Completado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Inicio
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    name="fecha_inicio"
                    defaultValue={formatDate(proyecto.fecha_inicio)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Límite
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    name="fecha_fin"
                    defaultValue={formatDate(proyecto.fecha_fin)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción / Objetivos
              </label>
              <textarea
                name="descripcion"
                rows={3}
                defaultValue={proyecto.descripcion || ''}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                placeholder="Detalles sobre el proyecto..."
              />
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-proyecto-form"
                disabled={isLoading}
                className="bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Grid Component ─────────────────────────────────────────────
export default function ProyectosGrid({ proyectos, clientes }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<Proyecto | null>(null);
  const [editTarget, setEditTarget] = useState<Proyecto | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteProyecto(deleteTarget.id);
    if (result.success) {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {proyectos.map((proyecto) => {
          const tareasPendientes = proyecto.tareas.filter(
            (t) => t.estatus !== 'COMPLETADA' && t.estatus !== 'CANCELADA'
          ).length;
          const tareasVencidas = proyecto.tareas.filter(
            (t) =>
              t.fecha_limite &&
              t.estatus !== 'COMPLETADA' &&
              t.estatus !== 'CANCELADA' &&
              new Date(t.fecha_limite).getTime() < new Date().getTime()
          ).length;

          return (
            <div key={proyecto.id} className="block group relative">
              {/* Action buttons — visible on hover */}
              <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditTarget(proyecto);
                  }}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm hover:shadow-md"
                  title="Editar proyecto"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTarget(proyecto);
                  }}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm hover:shadow-md"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Link href={`/proyectos/${proyecto.id}`} className="block h-full">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0" />

                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          proyecto.estado === 'COMPLETADO'
                            ? 'bg-green-100 text-green-700'
                            : proyecto.estado === 'ACTIVO'
                            ? 'bg-blue-100 text-blue-700'
                            : proyecto.estado === 'PLANIFICACION'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {proyecto.estado}
                      </span>
                    </div>

                    <h3
                      className="text-xl font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors line-clamp-2"
                      title={proyecto.nombre}
                    >
                      {proyecto.nombre}
                    </h3>

                    {proyecto.codigo && (
                      <span className="text-xs font-mono font-semibold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 w-fit mb-2">
                        {proyecto.codigo}
                      </span>
                    )}

                    <div className="text-sm font-semibold text-slate-500 mb-auto mt-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block w-fit">
                      {proyecto.cliente?.nombre || 'Interno'}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5" /> Pendientes
                        </div>
                        <div className="text-xl font-bold text-slate-700">
                          {tareasPendientes}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Vencidas
                        </div>
                        <div className="text-xl font-bold text-red-600">
                          {tareasVencidas}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}

        {proyectos.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              No hay proyectos registrados
            </h3>
            <p className="text-slate-500 mb-6">
              Comienza creando un nuevo proyecto para organizar sus tareas asociadas.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          proyecto={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditProyectoModal
          proyecto={editTarget}
          clientes={clientes}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
