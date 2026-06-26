'use client';

import React, { useState } from 'react';
import { Plus, PackageSearch, Layers, ChevronDown, ChevronRight, Edit2, Trash2, Tag } from 'lucide-react';
import { 
  createLineaProducto, 
  updateLineaProducto, 
  deleteLineaProducto, 
  createProductoServicio, 
  updateProductoServicio, 
  deleteProductoServicio 
} from './actions';

export function LineasClient({ initialLineas }: { initialLineas: any[] }) {
  const [lineas, setLineas] = useState(initialLineas);
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  
  // Modals state
  const [isLineaModalOpen, setIsLineaModalOpen] = useState(false);
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
  const [editingLinea, setEditingLinea] = useState<any>(null);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [activeLineaId, setActiveLineaId] = useState<string>('');

  const [formData, setFormData] = useState({ nombre: '', descripcion: '', precio_base: '' });

  const toggleLine = (id: string) => {
    setExpandedLines(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenLinea = (linea: any = null) => {
    setEditingLinea(linea);
    setFormData({ nombre: linea?.nombre || '', descripcion: linea?.descripcion || '', precio_base: '' });
    setIsLineaModalOpen(true);
  };

  const handleOpenProducto = (lineaId: string, producto: any = null) => {
    setActiveLineaId(lineaId);
    setEditingProducto(producto);
    setFormData({ 
      nombre: producto?.nombre || '', 
      descripcion: producto?.descripcion || '', 
      precio_base: producto?.precio_base?.toString() || '' 
    });
    setIsProductoModalOpen(true);
  };

  const handleSubmitLinea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLinea) {
      await updateLineaProducto(editingLinea.id, { nombre: formData.nombre, descripcion: formData.descripcion });
    } else {
      await createLineaProducto({ nombre: formData.nombre, descripcion: formData.descripcion });
    }
    // Refresh page conceptually via router (Next.js server actions revalidatePath handles it)
    window.location.reload(); 
  };

  const handleSubmitProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = formData.precio_base ? parseFloat(formData.precio_base) : undefined;
    
    if (editingProducto) {
      await updateProductoServicio(editingProducto.id, { nombre: formData.nombre, descripcion: formData.descripcion, precio_base: precio });
    } else {
      await createProductoServicio({ nombre: formData.nombre, descripcion: formData.descripcion, precio_base: precio, linea_producto_id: activeLineaId });
    }
    window.location.reload();
  };

  const handleDeleteLinea = async (id: string) => {
    if(window.confirm('¿Eliminar esta línea de negocio y todos sus productos?')) {
      await deleteLineaProducto(id);
      window.location.reload();
    }
  };

  const handleDeleteProducto = async (id: string) => {
    if(window.confirm('¿Eliminar este producto/servicio?')) {
      await deleteProductoServicio(id);
      window.location.reload();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-end">
        <button 
          onClick={() => handleOpenLinea()}
          className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" /> Nueva Línea de Negocio
        </button>
      </div>

      <div className="space-y-4">
        {lineas.length === 0 ? (
          <div className="bg-surface rounded-2xl p-10 text-center border border-slate-100 card-shadow">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No hay líneas configuradas</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Comienza agregando tu primera línea de negocio (ej. Desarrollo Web, Marketing Digital).</p>
          </div>
        ) : (
          lineas.map((linea) => (
            <div key={linea.id} className="bg-surface rounded-2xl border border-slate-100 card-shadow overflow-hidden transition-all duration-300">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => toggleLine(linea.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg transition-transform ${expandedLines[linea.id] ? 'bg-primary/10 text-primary rotate-90' : 'bg-slate-100 text-slate-500'}`}>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                      {linea.nombre}
                      <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {linea.productos.length} items
                      </span>
                    </h3>
                    {linea.descripcion && <p className="text-sm text-text-muted mt-0.5">{linea.descripcion}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenProducto(linea.id); }}
                    className="text-sm font-medium text-primary hover:text-primary-light flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Servicio
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenLinea(linea); }}
                    className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteLinea(linea.id); }}
                    className="p-2 text-slate-400 hover:text-danger transition-colors rounded-lg hover:bg-slate-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-items (Productos) */}
              {expandedLines[linea.id] && (
                <div className="border-t border-slate-100 bg-slate-50/30 p-5 pl-16 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                  {linea.productos.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No hay servicios en esta línea. Agrega uno nuevo.</p>
                  ) : (
                    linea.productos.map((prod: any) => (
                      <div key={prod.id} className="bg-white border border-slate-100 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start gap-3">
                          <Tag className="w-5 h-5 text-slate-300 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-slate-800">{prod.nombre}</h4>
                            {prod.descripcion && <p className="text-sm text-slate-500">{prod.descripcion}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {prod.precio_base ? (
                            <span className="font-bold text-success bg-success/10 px-3 py-1 rounded-lg">{formatCurrency(prod.precio_base)}</span>
                          ) : (
                            <span className="text-sm text-slate-400">Precio variable</span>
                          )}
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenProducto(linea.id, prod)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-md"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProducto(prod.id)}
                              className="p-1.5 text-slate-400 hover:text-danger hover:bg-slate-100 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Línea */}
      {isLineaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editingLinea ? 'Editar Línea de Negocio' : 'Nueva Línea de Negocio'}</h2>
            <form onSubmit={handleSubmitLinea} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Línea</label>
                <input 
                  type="text" 
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  placeholder="Ej. Marketing Digital"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea 
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 resize-none h-24"
                  placeholder="Descripción general de los servicios que incluye..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsLineaModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30"
                >
                  {editingLinea ? 'Guardar Cambios' : 'Crear Línea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {isProductoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editingProducto ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
            <form onSubmit={handleSubmitProducto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Servicio</label>
                <input 
                  type="text" 
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  placeholder="Ej. Campaña de Facebook Ads"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio Base (Opcional)</label>
                <input 
                  type="number"
                  step="0.01" 
                  value={formData.precio_base}
                  onChange={e => setFormData({...formData, precio_base: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  placeholder="Ej. 1500"
                />
                <p className="text-xs text-slate-500 mt-1">Si es variable, déjalo en blanco.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea 
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 resize-none h-20"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsProductoModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 text-white bg-primary hover:bg-primary-light rounded-xl font-bold transition-colors shadow-lg shadow-primary/30"
                >
                  {editingProducto ? 'Guardar Cambios' : 'Agregar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
