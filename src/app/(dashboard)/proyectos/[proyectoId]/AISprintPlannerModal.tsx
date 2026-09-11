'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  Loader2,
  X,
  Zap,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  FileText,
  Boxes,
  Copy
} from 'lucide-react';
import { generateAISprints } from '@/app/actions/sprints';
import { parseSprintPlan, getSprintPlanMetrics, ParsedSprint } from '@/lib/sprintPlanParser';

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  descripcionActual?: string | null;
  horasDiaActual?: number | null;
  diasSemanaActual?: number | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

const TEMPLATE_GIVING_OUT = `Plan de Sprints: WMS Giving Out (4 Semanas)
Sprint 1: Datos Maestros, Depositantes y Configuración de Reglas de Negocio
Objetivo del sprint: Parametrizar el sistema para que las reglas operativas (giro, lotes, caducidad, unidades de medida y equivalencias) dependan estrictamente de la configuración del cliente y no queden a criterio del operario.  
Tarea 1.1: Módulo de Depositantes y Giros Comerciales
Configurar el catálogo de clientes/depositantes con reglas operativas heredables.  
Subtarea 1: Modelar en base de datos la tabla depositantes / clientes con campos fiscales, de contacto y el enum/catálogo de giro (alimentos, ropa, maquila, farmacéutica, etc.).  
Subtarea 2: Crear CRUD en backend y endpoints para administración de depositantes.  
Subtarea 3: Diseñar e implementar en frontend el formulario de alta/edición de depositantes con campos bloqueados según perfil de usuario.  
Subtarea 4: Crear catálogo configurable de reglas por depositante (requiere lote: sí/no, maneja caducidad: sí/no, método de rotación: FIFO/FEFO).  
Subtarea 5: Implementar validación en middleware/servicios para impedir que operarios modifiquen reglas fijas del cliente durante la operación.  
Subtarea 6: Desarrollar pruebas unitarias de persistencia y restricciones de campos obligatorios.
Tarea 1.2: Maestro de Artículos (SKU, EAN y Conversiones de Empaque)
Gestionar la sincronización de SKU del cliente, código EAN y reglas de empaque (caja ↔ pieza).  
Subtarea 1: Estructurar tabla de artículos con SKU del cliente como identificador principal, descripción, código EAN y unidad base.  
Subtarea 2: Diseñar la tabla de factores de conversión de unidades de medida (ej. 1 caja = X piezas, 1 tarima/palet = Y cajas).  
Subtarea 3: Crear endpoints para registrar y consultar catálogo de artículos filtrado por depositante.  
Subtarea 4: Construir interfaz frontend para gestión de artículos con vista de capacidades de empaque.  
Subtarea 5: Implementar componente de validación de formato para código de barras EAN en la captura de ítems.  
Subtarea 6: Ejecutar pruebas de cálculo de conversión para entradas y salidas sin discrepancias de redondeo.  
Tarea 1.3: Zonificación de Almacén y Almacenes Virtuales por Estatus
Definir el layout físico y los almacenes virtuales de clasificación.  
Subtarea 1: Modelar estructura de almacenes físicos, zonas, pasillos, racks y niveles.  
Subtarea 2: Crear partición lógica de almacenes virtuales por estado: Conforme (Disponible), No Conforme / Merma, y Cuarentena.  
Subtarea 3: Desarrollar endpoints para listar y asignar ubicaciones con validación de capacidad por tipo de carga.  
Subtarea 4: Construir vista de gestión de ubicaciones en frontend indicando capacidad disponible vs. saturada.  
Subtarea 5: Configurar restricción lógica para evitar que el inventario quede permanentemente en "Inbox / Recepción".  
Subtarea 6: Realizar pruebas de asignación de almacén virtual para asegurar segregación de producto.
Sprint 2: Recepción por Factura Completa, Validación Física y Etiquetado
Objetivo del sprint: Construir el flujo de precarga de documento (previo), validación física en piso con discrepancias/mermas, asignación obligatoria de ubicación e impresión de etiquetas internas.  
Tarea 2.1: Carga de Previos y Documentos de Entrada
Digitalizar la intención de recibo antes de la llegada del transporte físico.  
Subtarea 1: Diseñar modelo de datos recepciones_previas (cliente, factura de respaldo, tipo de importación, lista de SKUs esperados).  
Subtarea 2: Construir endpoint para crear y cargar previo de recepción mediante formulario y/o carga de archivo.  
Subtarea 3: Desarrollar vista de captura de previos con bloqueo de edición una vez confirmado el previo.  
Subtarea 4: Implementar validación automática que verifique que los SKUs del previo existan en el catálogo del depositante.  
Subtarea 5: Agregar bandera de estatus de recepción (Pendiente de Arribo, En Proceso de Conteo, Cerrada).  
Subtarea 6: Documentar esquema de API del previo y validar respuestas de error ante datos incompletos.
Tarea 2.2: Validación Física por Factura Completa y Manejo de No Conformidades
Permitir la captura ciega o global del producto recibido contra el previo.  
Subtarea 1: Crear interfaz de conteo de recepción por factura completa (no línea por línea) para captura de cantidades reales.  
Subtarea 2: Implementar lógica de detección de variaciones: cálculo automático de faltantes, sobrantes y producto dañado.  
Subtarea 3: Desarrollar subflujo para desviar producto dañado o en exceso a almacén virtual de "No Conforme / Merma".  
Subtarea 4: Bloquear el cierre de recepción si existen discrepancias sin justificación o clasificación de estatus.  
Subtarea 5: Implementar captura obligatoria de lote y fecha de caducidad si el giro del cliente lo exige.  
Subtarea 6: Ejecutar pruebas de conciliación entre cantidad esperada en previo vs. cantidad física capturada.  
Tarea 2.3: Sugerencia de Ubicación, Cierre de Entrada y Generación de Etiquetas GivingOut
Ubicación en layout, reporte de cierre e impresión de etiquetas con código de barras.  
Subtarea 1: Implementar motor de sugerencia de ubicación física basado en capacidad y reglas de compatibilidad de zona.  
Subtarea 2: Forzar la confirmación de guardado (putaway) asegurando que nada quede flotando en zona de recepción.  
Subtarea 3: Diseñar plantilla de reporte PDF de cierre de recepción (hoja de recibo formal para el cliente con desglose y mermas).  
Subtarea 4: Construir endpoint para generar y descargar el reporte de cierre en PDF.  
Subtarea 5: Desarrollar módulo de generación de etiquetas internas "GivingOut" (formato código de barras/QR) por pieza, caja o palet.  
Subtarea 6: Validar formato de impresión para dispositivos térmicos o impresoras estándar de etiquetas.  
Sprint 3: Gestión de Pedidos, Reserva Automática y Portal de Clientes
Objetivo del sprint: Crear el ciclo de captura de pedidos con selección estricta de almacén virtual, reserva inmediata de stock para evitar backorders, flujo de aprobación y visibilidad para el cliente final.  
Tarea 3.1: Captura de Pedidos con Restricciones y Fechas de Compromiso
Construir la pantalla de creación de pedidos blindada contra errores operativos.  
Subtarea 1: Crear tabla pedidos con folio, cliente, tipo de almacén origen, fecha y hora de compromiso, prioridad y notas.  
Subtarea 2: Implementar endpoint para creación de pedido con validación estricta de campos obligatorios.  
Subtarea 3: Desarrollar interfaz de captura donde primero se seleccione el almacén origen (Conforme vs. No Conforme para donaciones/muestras).  
Subtarea 4: Filtrar el catálogo de artículos en la pantalla mostrando únicamente lo que tiene inventario real en ese almacén.  
Subtarea 5: Añadir campos obligatorios de fecha y hora límite de entrega (cita para transporte) y selector de prioridad.  
Subtarea 6: Emitir alerta visual y bloqueo si el usuario intenta ingresar una cantidad mayor a la existencia física disponible.  
Tarea 3.2: Motor de Reserva Automática y Flujo de Aprobación
Garantizar la disponibilidad del producto y el control administrativo del dueño.  
Subtarea 1: Desarrollar lógica de base de datos para reserva automática de unidades en cuanto se presiona "Crear Pedido".  
Subtarea 2: Calcular y exponer en base de datos dos métricas: Stock Físico y Stock Disponible (Físico - Reservado).  
Subtarea 3: Configurar estatus de orden: Solicitado (inicial) ➔ Aprobado (por Alejandra/GivingOut) ➔ En Picking.  
Subtarea 4: Crear panel de autorización de pedidos para el rol máster de GivingOut con opción de aprobar o rechazar.  
Subtarea 5: Bloquear cancelación automática desde el portal de cliente una vez aprobado el pedido (requiere solicitud y liberación manual).  
Subtarea 6: Realizar pruebas de concurrencia: dos pedidos intentando reservar el mismo remanente de stock simultáneamente.
Tarea 3.3: Portal del Cliente (Visibilidad de Inventario y Tracking de Pedidos)
Dar transparencia al depositante sobre sus existencias reales y estatus de compras.  
Subtarea 1: Diseñar vista de inventario para el usuario cliente desglosada por: Disponible, En Cuarentena y No Conforme.  
Subtarea 2: Implementar filtros avanzados en el portal cliente por SKU, número de lote, fecha de vencimiento y almacén.  
Subtarea 3: Crear vista de seguimiento donde el cliente consulte el estatus de sus pedidos solicitados en tiempo real.  
Subtarea 4: Bloquear acceso del usuario cliente a costos internos o inventarios pertenecientes a otros depositantes (multitenancy estricto).  
Subtarea 5: Construir exportador a Excel del inventario visible por cliente.  
Subtarea 6: Probar permisos de autenticación y aislamiento de datos por rol cliente.
Sprint 4: Picking, Despacho, Notificaciones FEFO y Trazabilidad
Objetivo del sprint: Habilitar el surtido con sugerencias FEFO/FIFO, registrar datos de transporte/guías, programar conteos cíclicos y activar alertas automáticas por correo.  
Tarea 4.1: Cola de Picking y Reglas de Salida (FEFO / FIFO)
Guiar al operario en el surtido optimizado respetando la caducidad y rotación.  
Subtarea 1: Generar automáticamente la lista u orden de picking cuando el pedido cambie a estado Aprobado.  
Subtarea 2: Implementar algoritmo de sugerencia de lotes por caducidad más cercana (FEFO) o entrada más antigua (FIFO) según regla de cliente.  
Subtarea 3: Adaptar la interfaz de picking para visualización fluida en tablets y dispositivos móviles de almacén.  
Subtarea 4: Integrar validación por escaneo (código de barras / QR de GivingOut) al momento de tomar la pieza/caja de la ubicación.  
Subtarea 5: Permitir confirmación de surtido parcial en caso de faltante físico en la ubicación y alertar al supervisor.  
Subtarea 6: Descontar definitivamente el inventario físico y liberar las unidades reservadas al completar el picking.  
Tarea 4.2: Módulo de Despacho, Mensajería y Guías
Completar el cierre logístico y la asignación de transporte.  
Subtarea 1: Crear interfaz de despacho y empaque final para consolidar órdenes listas para salida.  
Subtarea 2: Agregar campos obligatorios de transporte: tipo de unidad, empresa de mensajería/fletera y número de guía.  
Subtarea 3: Construir semáforo visual de estatus de despacho (Preparado, Listo para Carga, Despachado / En Ruta).  
Subtarea 4: Generar la orden de remisión/despacho en formato descargable e imprimible.  
Subtarea 5: Implementar endpoint para actualizar el pedido al estatus Entregado o Cerrado.  
Subtarea 6: Validar integración de campos de transporte con el reporte histórico de entregas.  
Tarea 4.3: Trazabilidad, Conteos Cíclicos y Alertas por Correo
Garantizar la auditoría de movimientos, auditorías periódicas y notificaciones preventivas.  
Subtarea 1: Registrar log inmutable de auditoría en cada movimiento (usuario, fecha, hora, tipo de movimiento, SKU y ubicación).  
Subtarea 2: Crear módulo de programación y ejecución de conteos cíclicos (configurables, ej. cada 15 días).  
Subtarea 3: Desarrollar pantalla de reconciliación de inventario para ajustes y correcciones autorizadas tras el conteo.  
Subtarea 4: Configurar servicio de notificaciones por correo para productos con fecha de caducidad próxima a vencer.  
Subtarea 5: Añadir alertas por email para stock bajo, pedidos en riesgo de retraso según hora de compromiso y ubicaciones saturadas.  
Subtarea 6: Ejecutar pruebas integrales de punta a punta (recepción ➔ almacenamiento ➔ pedido ➔ reserva ➔ picking ➔ despacho).`;

export default function AISprintPlannerModal({
  proyectoId,
  proyectoNombre,
  descripcionActual,
  horasDiaActual = 6,
  diasSemanaActual = 5,
  onSuccess,
  triggerButton,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [alcance, setAlcance] = useState(descripcionActual || '');
  const [semanas, setSemanas] = useState(4);
  const [horasDia, setHorasDia] = useState(horasDiaActual || 6);
  const [diasSemana, setDiasSemana] = useState(diasSemanaActual || 5);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado del parser inteligente
  const [parsedPlan, setParsedPlan] = useState<ParsedSprint[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const horasSemanales = horasDia * diasSemana;
  const capacidadTotal = horasSemanales * semanas;

  // Analizar automáticamente el texto para detectar planes estructurados de Gemini / IA
  useEffect(() => {
    if (!alcance || !alcance.trim()) {
      setParsedPlan(null);
      return;
    }

    const detected = parseSprintPlan(alcance, horasDia * diasSemana);
    setParsedPlan(detected);

    if (detected && detected.length > 0) {
      setSemanas(detected.length);
    }
  }, [alcance, horasDia, diasSemana]);

  const metrics = getSprintPlanMetrics(parsedPlan);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alcance.trim()) {
      setErrorMsg('El alcance o resumen de sprints no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResultMsg(null);

    const res = await generateAISprints({
      proyectoId,
      alcance: alcance.trim(),
      semanas,
      horasDia,
      diasSemana,
    });

    setIsLoading(false);

    if (res.success) {
      setResultMsg(res.message || 'Sprints, tareas y subtareas generadas con éxito');
      setTimeout(() => {
        setIsOpen(false);
        if (onSuccess) onSuccess();
      }, 1600);
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al generar los sprints.');
    }
  };

  const setTemplateGivingOut = () => {
    setAlcance(TEMPLATE_GIVING_OUT);
    setHorasDia(6);
    setDiasSemana(5);
    setShowPreview(true);
  };

  const setTemplatePortalAlumno = () => {
    setAlcance(
      'Portal del Alumno (Les Rois): Autenticación con aislamiento de roles/grupos, Panel de administración de usuarios y horarios, Zoom API Server-to-Server OAuth para clases virtuales en vivo, e Inteligencia Artificial con Context Engineering para tutorías personalizadas.'
    );
    setSemanas(4);
    setHorasDia(6);
    setDiasSemana(5);
    setShowPreview(false);
  };

  const modalJSX = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-indigo-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-100 text-slate-900 relative shrink-0">
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    IA Sprint Architect &bull; Gemini Ready
                  </span>
                  {metrics.totalSprints > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Plan Inteligente Detectado
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Builder de Sprints: {proyectoNombre}
                </h2>
              </div>
            </div>

            <button
              onClick={() => !isLoading && setIsOpen(false)}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            Pega aquí el plan de sprints procesado con Gemini o redacta tus requerimientos. El builder reconocerá automáticamente los Sprints, sus Objetivos, las Tareas y el checklist de Subtareas para poblar tu tablero Kanban.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {resultMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-medium border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{resultMsg}</div>
            </div>
          )}

          {/* Quick templates pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Plantillas de Ejemplo Rápido:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={setTemplateGivingOut}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="Cargar plan Giving Out WMS (4 Sprints, 12 Tareas, 72 Subtareas)"
              >
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                WMS Giving Out (Gemini)
              </button>
              <button
                type="button"
                onClick={setTemplatePortalAlumno}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="Cargar alcance general del Portal del Alumno Les Rois"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                Portal del Alumno
              </button>
            </div>
          </div>

          <form id="sprint-ai-form" onSubmit={handleGenerate} className="space-y-5">
            {/* Scope / Gemini plan input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Resumen de Sprints / Salida de Gemini
                </label>
                {alcance && (
                  <button
                    type="button"
                    onClick={() => setAlcance('')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    Limpiar texto
                  </button>
                )}
              </div>

              <textarea
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                rows={7}
                required
                placeholder={`Pega aquí el texto que te entregó Gemini. Ejemplo:

Sprint 1: Datos Maestros y Configuración
Objetivo del sprint: Parametrizar el sistema...
Tarea 1.1: Módulo de Depositantes
Configurar el catálogo de clientes...
Subtarea 1: Modelar tabla en base de datos...
Subtarea 2: Crear CRUD en backend...
Tarea 1.2: Maestro de Artículos...`}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y shadow-sm text-slate-800 leading-relaxed placeholder:text-slate-400"
              />
            </div>

            {/* Smart Detection Card & Interactive Preview */}
            {metrics.totalSprints > 0 && parsedPlan && (
              <div className="bg-gradient-to-r from-violet-50/80 via-indigo-50/80 to-purple-50/80 border border-indigo-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-extrabold text-indigo-900">
                        Estructura Detectada con Éxito
                      </h4>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        Gemini Parser identificó {metrics.totalSprints} sprints con sus tareas y entregables.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-white text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl shadow-2xs">
                      {metrics.totalSprints} Sprints &bull; {metrics.totalTareas} Tareas &bull; {metrics.totalSubtareas} Subtareas
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 transition-all"
                    >
                      <span>{showPreview ? 'Ocultar' : 'Ver Detalle'}</span>
                      {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Preview */}
                {showPreview && (
                  <div className="bg-white rounded-xl border border-indigo-100 p-3 max-h-56 overflow-y-auto space-y-3 divide-y divide-slate-100 text-xs text-slate-700 animate-in fade-in duration-200">
                    {parsedPlan.map((s) => (
                      <div key={s.numero} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            {s.nombre}
                          </span>
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold">
                            {s.tareas.length} tareas
                          </span>
                        </div>
                        {s.objetivo && (
                          <p className="text-[11px] text-slate-500 italic pl-3.5">
                            🎯 {s.objetivo}
                          </p>
                        )}
                        <div className="pl-3.5 space-y-1">
                          {s.tareas.map((t) => (
                            <div key={t.numero} className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              <span className="truncate max-w-[400px]">
                                <strong className="text-slate-800 font-semibold">{t.numero ? `Tarea ${t.numero}: ` : ''}</strong>
                                {t.titulo}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  t.prioridad === 'URGENTE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {t.prioridad}
                                </span>
                                {t.subtareas.length > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                                    <CheckSquare className="w-2.5 h-2.5" />
                                    {t.subtareas.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grid Inputs: Semanas, Horas por día, Días por semana */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  SEMANAS
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={semanas}
                    onChange={(e) => setSemanas(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                  />
                  <span className="text-xs text-slate-500 font-semibold">Sprints</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  HORAS / DÍA
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={horasDia}
                    onChange={(e) => setHorasDia(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                  />
                  <span className="text-xs text-slate-500 font-semibold">hrs/dev/día</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  DÍAS / SEMANA
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={diasSemana}
                    onChange={(e) => setDiasSemana(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 font-mono text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 outline-none"
                  />
                  <span className="text-xs text-slate-500 font-semibold">días/sem</span>
                </div>
              </div>
            </div>

            {/* Capacity summary badge */}
            <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                  Capacidad Total Planificada
                </span>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {semanas} semanas &times; {diasSemana} días &times; {horasDia} hrs/día por desarrollador
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 font-mono">
                  {capacidadTotal} hrs
                </span>
                <p className="text-[10px] font-semibold text-slate-500">Total Proyecto</p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            {metrics.totalSprints > 0
              ? `Listo para crear ${metrics.totalSprints} sprints, ${metrics.totalTareas} tareas y ${metrics.totalSubtareas} subtareas.`
              : 'Pega tu plan de Gemini o escribe un alcance general.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="px-5 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="sprint-ai-form"
              disabled={isLoading}
              className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  Construyendo Sprints y Subtareas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {metrics.totalSprints > 0
                    ? `Generar ${metrics.totalSprints} Sprints y ${metrics.totalSubtareas} Subtareas`
                    : 'Generar Sprints con IA'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Generar Plan de Sprints IA</span>
        </button>
      )}

      {mounted && isOpen && createPortal(modalJSX, document.body)}
    </>
  );
}
