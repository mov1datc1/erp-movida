'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { deleteTarea } from '@/app/actions/tareas';

interface Props {
  tareaId: string;
  tareaTitulo: string;
  onDeleted?: (id: string) => void;
  triggerButton?: React.ReactNode;
}

export default function EliminarTareaModal({
  tareaId,
  tareaTitulo,
  onDeleted,
  triggerButton,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setErrorMsg(null);

    const result = await deleteTarea(tareaId);

    setIsLoading(false);

    if (result.success) {
      setIsOpen(false);
      if (onDeleted) {
        onDeleted(tareaId);
      }
    } else {
      setErrorMsg(result.error || 'Error al eliminar la tarjeta');
    }
  };

  const modalJSX = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        if (!isLoading) setIsOpen(false);
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 p-6 space-y-5 relative z-[10001]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoading) setIsOpen(false);
            }}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
            ¿Eliminar tarjeta de tarea?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Esta acción no se puede deshacer. La tarjeta será eliminada permanentemente del tablero.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Tarjeta a eliminar
          </span>
          <p className="text-sm font-bold text-slate-800 line-clamp-2">
            {tareaTitulo}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            disabled={isLoading}
            className="px-4 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-red-600/20 hover:shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar Tarjeta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {triggerButton ? (
        <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>{triggerButton}</div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar tarjeta"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {mounted && isOpen && createPortal(modalJSX, document.body)}
    </>
  );
}
