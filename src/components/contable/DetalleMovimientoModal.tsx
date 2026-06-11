'use client';

import React from 'react';
import { X, Calendar, DollarSign, Tag, FileText, Wallet } from 'lucide-react';
import { MovimientoData } from './MovimientoModal';

interface DetalleMovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MovimientoData | null;
}

export function DetalleMovimientoModal({ isOpen, onClose, data }: DetalleMovimientoModalProps) {
  if (!isOpen || !data) return null;

  const formatCurrency = (amount: number, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
  };

  const isIngreso = data.tipo === 'Ingreso';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-6 text-white ${isIngreso ? 'bg-success' : 'bg-danger'} transition-colors duration-300 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Detalle de {data.tipo}
              </h2>
              <p className="text-white/80 text-sm mt-1">{data.descripcion}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <DollarSign className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monto Local</p>
                <p className={`text-lg font-bold ${isIngreso ? 'text-success' : 'text-danger'}`}>
                  {isIngreso ? '+' : '-'}{formatCurrency(data.monto)}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <DollarSign className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monto USD</p>
                <p className="text-lg font-bold text-slate-800">
                  {data.monto_usd ? formatCurrency(data.monto_usd, 'USD') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <Calendar className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-sm font-semibold text-slate-800">{data.fecha}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <Wallet className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Origen</p>
                <p className="text-sm font-semibold text-slate-800">{data.origen || 'No especificado'}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 col-span-2">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <Tag className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Categoría</p>
                <span className="text-sm font-medium px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded-lg inline-block">
                  {data.categoria}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 col-span-2">
              <div className="p-2 bg-white rounded-lg shadow-sm h-fit">
                <FileText className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-slate-700 leading-relaxed">{data.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
