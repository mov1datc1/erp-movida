'use client';

import React, { useState } from "react";
import { Plus, ArrowDownRight, ArrowUpRight, Filter, Download, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { MovimientoModal, MovimientoData } from "@/components/contable/MovimientoModal";
import { DetalleMovimientoModal } from "@/components/contable/DetalleMovimientoModal";
import { deleteMovimiento } from "./actions";
import { FlujoCajaView } from "./components/FlujoCajaView";
import { EstadoResultadosView } from "./components/EstadoResultadosView";
import { MovimientoFinanciero } from "@prisma/client";

type Movimiento = {
  id: string;
  fecha: string;
  rawFecha: string;
  descripcion: string;
  monto: number;
  monto_usd: number | null;
  origen: string;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
};

interface ContableClientProps {
  movimientos: Movimiento[];
  balanceTotal: number;
  ingresosMes: number;
  egresosMes: number;
  rawMovimientos: MovimientoFinanciero[];
}

export default function ContableClient({ movimientos, balanceTotal, ingresosMes, egresosMes, rawMovimientos }: ContableClientProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'flujo' | 'resultados'>('resumen');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Ingreso' | 'Egreso' | null>(null);
  const [editingData, setEditingData] = useState<MovimientoData | null>(null);
  
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState<MovimientoData | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleOpenModal = (tipo: 'Ingreso' | 'Egreso') => {
    setModalType(tipo);
    setEditingData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (mov: Movimiento) => {
    setActiveMenuId(null);
    setModalType(mov.tipo);
    setEditingData({
      id: mov.id,
      tipo: mov.tipo,
      monto: mov.monto,
      monto_usd: mov.monto_usd,
      fecha: mov.rawFecha,
      categoria: mov.categoria,
      descripcion: mov.descripcion,
      origen: mov.origen
    });
    setIsModalOpen(true);
  };

  const handleDetail = (mov: Movimiento) => {
    setActiveMenuId(null);
    setDetalleData({
      id: mov.id,
      tipo: mov.tipo,
      monto: mov.monto,
      monto_usd: mov.monto_usd,
      fecha: mov.fecha, // We show formatted date in detail
      categoria: mov.categoria,
      descripcion: mov.descripcion,
      origen: mov.origen
    });
    setIsDetalleOpen(true);
  };

  const handleDelete = async (id: string) => {
    setActiveMenuId(null);
    if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      const res = await deleteMovimiento(id);
      if (!res.success) {
        alert('Error al eliminar');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Finanzas y Contabilidad</h1>
          <p className="text-text-muted mt-1">Control de ingresos, egresos y reportes financieros.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenModal('Ingreso')}
            className="bg-success hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" /> Ingreso
          </button>
          <button 
            onClick={() => handleOpenModal('Egreso')}
            className="bg-danger hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" /> Egreso
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resumen' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('flujo')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'flujo' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Flujo de Dinero
        </button>
        <button
          onClick={() => setActiveTab('resultados')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resultados' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Estado de Resultados
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'resumen' && (
        <div className="space-y-6 animate-in fade-in duration-300">
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

          <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-visible">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h3 className="font-bold text-text-main">Últimos Movimientos</h3>
              <div className="flex gap-2">
                <button className="text-text-muted hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors">
                  <Filter className="w-4 h-4" /> Filtrar
                </button>
                <button className="text-text-muted hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors ml-4">
                  <Download className="w-4 h-4" /> Exportar
                </button>
              </div>
            </div>
            <div className="overflow-x-visible">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-slate-100 uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Fecha</th>
                    <th className="py-3 px-6 font-semibold">Descripción</th>
                    <th className="py-3 px-6 font-semibold">Categoría</th>
                    <th className="py-3 px-6 font-semibold text-right">Monto</th>
                    <th className="py-3 px-6 font-semibold text-center w-20">Acciones</th>
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
                      <td className="py-4 px-6 text-center relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === mov.id ? null : mov.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === mov.id && (
                          <div className="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-10 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {/* Backdrop para cerrar el menú si se hace click fuera (simplificado) */}
                            <div className="fixed inset-0 z-[-1]" onClick={() => setActiveMenuId(null)} />
                            
                            <button 
                              onClick={() => handleDetail(mov)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4 text-slate-400" /> Detalle
                            </button>
                            <button 
                              onClick={() => handleEdit(mov)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4 text-slate-400" /> Editar
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => handleDelete(mov.id)}
                              className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4 text-danger/70" /> Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {movimientos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted">No hay movimientos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flujo' && (
        <FlujoCajaView movimientos={rawMovimientos} />
      )}

      {activeTab === 'resultados' && (
        <EstadoResultadosView movimientos={rawMovimientos} />
      )}

      <MovimientoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialType={modalType} 
        initialData={editingData}
      />

      <DetalleMovimientoModal
        isOpen={isDetalleOpen}
        onClose={() => setIsDetalleOpen(false)}
        data={detalleData}
      />
    </div>
  );
}

