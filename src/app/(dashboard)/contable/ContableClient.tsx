'use client';

import React, { useState } from "react";
import { Plus, ArrowDownRight, ArrowUpRight, Filter, Download } from "lucide-react";
import { MovimientoModal } from "@/components/contable/MovimientoModal";

type Movimiento = {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
};

interface ContableClientProps {
  movimientos: Movimiento[];
  balanceTotal: number;
  ingresosMes: number;
  egresosMes: number;
}

export default function ContableClient({ movimientos, balanceTotal, ingresosMes, egresosMes }: ContableClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Ingreso' | 'Egreso' | null>(null);

  const handleOpenModal = (tipo: 'Ingreso' | 'Egreso') => {
    setModalType(tipo);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Finanzas y Contabilidad</h1>
          <p className="text-text-muted mt-1">Control de ingresos, egresos y tareas administrativas.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-text-main px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => handleOpenModal('Ingreso')}
            className="bg-success hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" /> Nuevo Ingreso
          </button>
          <button 
            onClick={() => handleOpenModal('Egreso')}
            className="bg-danger hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" /> Nuevo Egreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-slate-100 card-shadow">
          <p className="text-sm font-medium text-text-muted">Balance Total</p>
          <h3 className="text-3xl font-bold text-text-main mt-2">{formatCurrency(balanceTotal)}</h3>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-slate-100 card-shadow flex gap-4">
          <div className="p-3 bg-success/10 text-success rounded-xl h-fit">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-muted">Ingresos (Mes)</p>
            <h3 className="text-2xl font-bold text-text-main mt-1">{formatCurrency(ingresosMes)}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-slate-100 card-shadow flex gap-4">
          <div className="p-3 bg-danger/10 text-danger rounded-xl h-fit">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-muted">Egresos (Mes)</p>
            <h3 className="text-2xl font-bold text-text-main mt-1">{formatCurrency(egresosMes)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-text-main">Últimos Movimientos</h3>
          <button className="text-text-muted hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-text-muted border-b border-slate-100 uppercase tracking-wider">
                <th className="py-3 px-6 font-semibold">Fecha</th>
                <th className="py-3 px-6 font-semibold">Descripción</th>
                <th className="py-3 px-6 font-semibold">Categoría</th>
                <th className="py-3 px-6 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movimientos.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-6 text-sm text-text-muted">{mov.fecha}</td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-text-main">{mov.descripcion}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-text-muted rounded-lg">
                      {mov.categoria || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`text-sm font-bold ${mov.tipo === 'Ingreso' ? 'text-success' : 'text-text-main'}`}>
                      {mov.tipo === 'Ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                    </span>
                  </td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">No hay movimientos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MovimientoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialType={modalType} 
      />
    </div>
  );
}
