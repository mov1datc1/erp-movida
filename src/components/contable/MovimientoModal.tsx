'use client';

import React, { useState } from 'react';
import { X, Calendar, DollarSign, Tag, FileText, ArrowRight } from 'lucide-react';
import { createMovimiento } from '@/app/(dashboard)/contable/actions';

type MovimientoType = 'Ingreso' | 'Egreso' | null;

interface MovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: MovimientoType;
}

export function MovimientoModal({ isOpen, onClose, initialType }: MovimientoModalProps) {
  const [tipo, setTipo] = useState<MovimientoType>(initialType || 'Ingreso');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update tipo when initialType changes
  React.useEffect(() => {
    if (initialType) setTipo(initialType);
  }, [initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) return;
    
    setIsSubmitting(true);
    try {
      const res = await createMovimiento({
        tipo,
        monto: parseFloat(monto),
        fecha,
        categoria,
        descripcion
      });
      
      if (res.success) {
        // Reset form
        setMonto('');
        setFecha('');
        setCategoria('');
        setDescripcion('');
        onClose();
      } else {
        alert(res.error || 'Error al guardar el movimiento');
      }
    } catch (error) {
      console.error(error);
      alert('Error de red');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className={`p-6 text-white ${tipo === 'Ingreso' ? 'bg-success' : 'bg-danger'} transition-colors duration-300 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          
          <div className="flex justify-between items-center relative z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Registrar {tipo}
            </h2>
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
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setTipo('Ingreso')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tipo === 'Ingreso' ? 'bg-white text-success shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo('Egreso')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tipo === 'Egreso' ? 'bg-white text-danger shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Egreso
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-text-main ml-1">Monto</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-text-main ml-1">Fecha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-main ml-1">Categoría</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="w-4 h-4 text-slate-400" />
                </div>
                <select
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-medium appearance-none"
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {tipo === 'Ingreso' ? (
                    <>
                      <option value="Ventas">Ventas / Proyectos</option>
                      <option value="Servicios">Servicios Adicionales</option>
                      <option value="Otros">Otros Ingresos</option>
                    </>
                  ) : (
                    <>
                      <option value="Nomina">Nómina</option>
                      <option value="Servicios">Servicios (Luz, Internet)</option>
                      <option value="Software">Licencias de Software</option>
                      <option value="Impuestos">Impuestos</option>
                      <option value="Otros">Otros Egresos</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-main ml-1">Descripción</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <textarea
                  required
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-medium resize-none"
                  placeholder="Detalles del movimiento..."
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 ${
                  tipo === 'Ingreso' ? 'bg-success hover:bg-emerald-600 shadow-success/20' : 'bg-danger hover:bg-red-600 shadow-danger/20'
                }`}
              >
                {isSubmitting ? 'Guardando...' : `Guardar ${tipo}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
