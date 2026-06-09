'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Clock, Send, Loader2 } from 'lucide-react';
import { addComentario } from '@/app/actions/tareas';

interface Comentario {
  id: string;
  texto: string;
  createdAt: Date;
}

interface Tarea {
  id: string;
  titulo: string;
  comentarios: Comentario[];
}

interface Props {
  tarea: Tarea;
  onClose: () => void;
  onAddOptimistic: (tareaId: string, comentario: Comentario) => void;
}

export default function BitacoraModal({ tarea, onClose, onAddOptimistic }: Props) {
  const [texto, setTexto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await addComentario(tarea.id, texto);
    
    if (result.success && result.data) {
      // Optimistic UI update
      onAddOptimistic(tarea.id, result.data);
      setTexto('');
    } else {
      setError(result.error || 'Ocurrió un error al guardar el comentario');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Bitácora de Tarea
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-white border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm leading-tight">{tarea.titulo}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {tarea.comentarios.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No hay comentarios en la bitácora aún.</p>
            </div>
          ) : (
            tarea.comentarios.map((comentario) => (
              <div key={comentario.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <time dateTime={new Date(comentario.createdAt).toISOString()}>
                    {new Date(comentario.createdAt).toLocaleString(undefined, { 
                      dateStyle: 'medium', 
                      timeStyle: 'short' 
                    })}
                  </time>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {comentario.texto}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
          {error && (
            <div className="mb-2 p-2 bg-red-50 text-red-600 rounded text-xs font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe un comentario, actualización o nota..."
              className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !texto.trim()}
              className="absolute right-2 bottom-2 p-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 text-center">Presiona Enter para enviar, Shift + Enter para salto de línea.</p>
        </div>
      </div>
    </div>
  );
}
