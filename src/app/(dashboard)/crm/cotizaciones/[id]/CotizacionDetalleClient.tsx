'use client';

import React, { useState } from 'react';
import { FileText, ArrowLeft, Plus, Trash2, Tag, Loader2, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { addCotizacionItem, deleteCotizacionItem } from './actions';

export function CotizacionDetalleClient({ cotizacion, catalog }: { cotizacion: any, catalog: any[] }) {
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    descripcion: '',
    cantidad: '1',
    precio_unitario: ''
  });

  const handleSelectProducto = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setSelectedProducto(null);
      setFormData({ ...formData, descripcion: '', precio_unitario: '' });
      return;
    }
    
    // Find product in catalog
    let foundProd = null;
    for (const linea of catalog) {
      const prod = linea.productos.find((p: any) => p.id === val);
      if (prod) {
        foundProd = prod;
        break;
      }
    }
    
    setSelectedProducto(foundProd);
    if (foundProd) {
      setFormData({
        ...formData,
        descripcion: foundProd.nombre,
        precio_unitario: foundProd.precio_base ? foundProd.precio_base.toString() : ''
      });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await addCotizacionItem(cotizacion.id, {
      producto_id: selectedProducto?.id,
      descripcion: formData.descripcion,
      cantidad: parseInt(formData.cantidad, 10),
      precio_unitario: parseFloat(formData.precio_unitario)
    });
    
    setIsLoading(false);
    setIsAddItemModalOpen(false);
    setFormData({ descripcion: '', cantidad: '1', precio_unitario: '' });
    setSelectedProducto(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('¿Eliminar este ítem de la cotización?')) {
      await deleteCotizacionItem(itemId, cotizacion.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/crm/cotizaciones"
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
            Cotización {cotizacion.folio}
            <span className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{cotizacion.estatus}</span>
          </h1>
          <p className="text-text-muted mt-1">Cliente: <span className="font-semibold text-slate-700">{cotizacion.cliente.nombre}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-text-main flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Ítems de Cotización
              </h3>
              {cotizacion.estatus === 'BORRADOR' && (
                <button 
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="text-sm font-medium text-primary hover:text-primary-light flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar Ítem
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3 font-semibold">Descripción / Producto</th>
                    <th className="px-6 py-3 font-semibold text-center">Cant.</th>
                    <th className="px-6 py-3 font-semibold text-right">Precio Unitario</th>
                    <th className="px-6 py-3 font-semibold text-right">Subtotal</th>
                    <th className="px-6 py-3 font-semibold w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cotizacion.items.length > 0 ? (
                    cotizacion.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{item.descripcion}</p>
                          {item.producto && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Tag className="w-3 h-3" />
                              {item.producto.linea_producto.nombre}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">
                          {item.cantidad}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {formatCurrency(item.precio_unitario)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-primary">
                          {formatCurrency(item.monto_total)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {cotizacion.estatus === 'BORRADOR' && (
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-danger rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <PackageSearch className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-text-main">Cotización Vacía</p>
                        <p className="text-sm mt-1">Agrega productos o servicios para calcular el total.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {cotizacion.items.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-500 mb-1">Monto Total</p>
                  <p className="text-3xl font-bold text-success">{formatCurrency(cotizacion.monto)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-slate-100 card-shadow p-6">
            <h3 className="font-bold text-slate-800 mb-4">Resumen</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium text-slate-800">{cotizacion.cliente.nombre}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Empresa</span>
                <span className="font-medium text-slate-800">{cotizacion.cliente.empresa || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Fecha Creación</span>
                <span className="font-medium text-slate-800">{new Date(cotizacion.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Item */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Agregar Ítem</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto o Servicio (Catálogo)</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800 bg-white"
                  onChange={handleSelectProducto}
                  defaultValue=""
                >
                  <option value="">-- Ítem Personalizado --</option>
                  {catalog.map(linea => (
                    <optgroup key={linea.id} label={linea.nombre}>
                      {linea.productos.map((prod: any) => (
                        <option key={prod.id} value={prod.id}>{prod.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
                <input 
                  type="text" 
                  required
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  placeholder="Descripción del ítem"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formData.cantidad}
                    onChange={e => setFormData({...formData, cantidad: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio Unit. *</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0"
                      value={formData.precio_unitario}
                      onChange={e => setFormData({...formData, precio_unitario: e.target.value})}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || !formData.descripcion || !formData.precio_unitario}
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Ítem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
