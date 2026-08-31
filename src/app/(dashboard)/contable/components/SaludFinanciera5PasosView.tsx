'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Scissors,
  Package,
  Building2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Sparkles,
  Calculator,
  RefreshCw,
  PiggyBank,
  DollarSign,
  FileText,
  ChevronRight,
  Brain,
  CalendarCheck,
  ShoppingBag,
  CreditCard,
  Target,
  Info
} from 'lucide-react';

interface Movimiento {
  id: string;
  fecha: string;
  rawFecha: string;
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
}

interface Props {
  movimientos: Movimiento[];
  balanceTotal: number;
  ingresosMes: number;
  egresosMes: number;
  facturasPendientes?: any[];
  rawMovimientos?: any[];
  proyectos?: any[];
}

export function SaludFinanciera5PasosView({
  movimientos,
  balanceTotal,
  ingresosMes,
  egresosMes,
  facturasPendientes = [],
  proyectos = []
}: Props) {
  const [pasoActivo, setPasoActivo] = useState<1 | 2 | 3 | 4 | 5 | 'decision_engine'>(1);

  // -------------------------------------------------------------
  // MOTOR DE DECISIONES DE INVERSIÓN Y COMPRAS
  // -------------------------------------------------------------
  const [conceptoInversion, setConceptoInversion] = useState('Compra de Servidor / Equipo Tecnológico');
  const [montoInversion, setMontoInversion] = useState<number>(45000);
  const [modalidadInversion, setModalidadInversion] = useState<'CONTADO' | 'DIFERIDO_3' | 'DIFERIDO_6'>('CONTADO');

  // -------------------------------------------------------------
  // PLANIFICADOR DE PAGO DE DEUDAS
  // -------------------------------------------------------------
  const [conceptoDeudaTarget, setConceptoDeudaTarget] = useState('Pago de Impuestos / Proveedor Crítico');
  const [montoDeudaTarget, setMontoDeudaTarget] = useState<number>(30000);

  // -------------------------------------------------------------
  // SIMULATOR STATES
  // -------------------------------------------------------------
  const [porcentajeCorteEgresos, setPorcentajeCorteEgresos] = useState<number>(25);
  const [porcentajeCobranza, setPorcentajeCobranza] = useState<number>(50);
  const [deudas, setDeudas] = useState([
    { id: '1', concepto: 'Recargos Fiscales / Impuestos Vencidos', monto: 85000, tasaAnual: 36, tipo: 'Fiscal/SAT' },
    { id: '2', concepto: 'Tarjeta de Crédito Corporativa', monto: 45000, tasaAnual: 48, tipo: 'Bancario Alta Tasa' },
    { id: '3', concepto: 'Proveedor Insumos (Vencido)', monto: 62000, tasaAnual: 18, tipo: 'Comercial' },
  ]);
  const [tasaRefinanciamiento, setTasaRefinanciamiento] = useState<number>(14);

  // -------------------------------------------------------------
  // CALCULATED METRICS & DECISION LOGIC
  // -------------------------------------------------------------
  const burnRateDiario = useMemo(() => {
    return egresosMes > 0 ? egresosMes / 30 : 1;
  }, [egresosMes]);

  const runwayDias = useMemo(() => {
    if (burnRateDiario <= 0) return 999;
    return Math.max(0, Math.round(balanceTotal / burnRateDiario));
  }, [balanceTotal, burnRateDiario]);

  const totalFacturasPendientes = useMemo(() => {
    return facturasPendientes.reduce((sum, f) => sum + (f.total || f.monto || 0), 0);
  }, [facturasPendientes]);

  // Categorize expenses (Esenciales vs Posponibles/Eliminables)
  const { egresosEsenciales, egresosReducibles } = useMemo(() => {
    const egresos = movimientos.filter(m => m.tipo === 'Egreso');
    let esencialesSum = 0;
    let reduciblesSum = 0;

    egresos.forEach(m => {
      const cat = (m.categoria || '').toLowerCase();
      if (
        cat.includes('nómina') ||
        cat.includes('nomina') ||
        cat.includes('sueldo') ||
        cat.includes('renta') ||
        cat.includes('alquiler') ||
        cat.includes('impuesto') ||
        cat.includes('sat') ||
        cat.includes('servicio')
      ) {
        esencialesSum += m.monto;
      } else {
        reduciblesSum += m.monto;
      }
    });

    if (esencialesSum === 0 && reduciblesSum === 0 && egresosMes > 0) {
      esencialesSum = egresosMes * 0.7;
      reduciblesSum = egresosMes * 0.3;
    }

    return { egresosEsenciales: esencialesSum, egresosReducibles: reduciblesSum };
  }, [movimientos, egresosMes]);

  // -------------------------------------------------------------
  // AI DECISION ENGINE CALCULATIONS
  // -------------------------------------------------------------
  const evaluacionInversion = useMemo(() => {
    let impactoInmediato = montoInversion;
    let cuotaMensual = montoInversion;

    if (modalidadInversion === 'DIFERIDO_3') {
      impactoInmediato = montoInversion / 3;
      cuotaMensual = montoInversion / 3;
    } else if (modalidadInversion === 'DIFERIDO_6') {
      impactoInmediato = montoInversion / 6;
      cuotaMensual = montoInversion / 6;
    }

    const nuevoBalance = balanceTotal - impactoInmediato;
    const nuevoRunway = Math.max(0, Math.round(nuevoBalance / burnRateDiario));

    let dictamen: 'SEGURO' | 'CONDICIONADO' | 'INVIABLE' = 'SEGURO';
    let justificacion = '';
    let fechaSugerida = '';

    if (nuevoRunway >= 45 && nuevoBalance >= egresosEsenciales * 0.5) {
      dictamen = 'SEGURO';
      justificacion = `Liquidez holgada. Después de realizar la inversión, mantienes ${nuevoRunway} días de Runway y reservas para nómina.`;
      fechaSugerida = 'HOY MISMO (Disponibilidad inmediata)';
    } else if (nuevoRunway >= 20) {
      dictamen = 'CONDICIONADO';
      justificacion = `Factible pero reduce el Runway a ${nuevoRunway} días. Se recomienda diferir a cuotas o cobrar el 40% de facturas pendientes primero.`;
      fechaSugerida = 'EN 10-14 DÍAS (Tras cobranza programada)';
    } else {
      dictamen = 'INVIABLE';
      justificacion = `Riesgo alto de bache de caja. Esta compra descapitalizaría la empresa en menos de 20 días.`;
      fechaSugerida = 'EN 30-45 DÍAS (O diferir a 6 meses con anticipo menor al 15%)';
    }

    return {
      impactoInmediato,
      cuotaMensual,
      nuevoBalance,
      nuevoRunway,
      dictamen,
      justificacion,
      fechaSugerida,
    };
  }, [balanceTotal, burnRateDiario, egresosEsenciales, montoInversion, modalidadInversion]);

  // Debt Payoff Evaluator
  const evaluacionPagoDeudaTarget = useMemo(() => {
    const reservaMinima = egresosEsenciales * 0.4;
    const cajaDisponibleParaDeuda = Math.max(0, balanceTotal - reservaMinima);
    const cubreDeudaHoy = cajaDisponibleParaDeuda >= montoDeudaTarget;

    const fechaRecomendada = cubreDeudaHoy
      ? 'HOY (Fondos suficientes y reserva protegida)'
      : 'SEMANA 2 (Tras ingresar cobros pendientes del pipeline)';

    return {
      reservaMinima,
      cajaDisponibleParaDeuda,
      cubreDeudaHoy,
      fechaRecomendada,
    };
  }, [balanceTotal, egresosEsenciales, montoDeudaTarget]);

  // Step 3 Simulation calculations
  const ahorroEgresosMes = (egresosReducibles * porcentajeCorteEgresos) / 100;
  const nuevoEgresoMes = egresosMes - ahorroEgresosMes;
  const nuevoBurnRate = nuevoEgresoMes > 0 ? nuevoEgresoMes / 30 : 1;
  const nuevoRunwayDias = Math.max(0, Math.round(balanceTotal / nuevoBurnRate));
  const diasGanadosRunway = nuevoRunwayDias - runwayDias;

  // Step 4 Simulation calculations
  const dineroLiberadoCobranza = (totalFacturasPendientes * porcentajeCobranza) / 100;
  const nuevoBalanceConCobranza = balanceTotal + dineroLiberadoCobranza;
  const runwayConCobranzaDias = Math.max(0, Math.round(nuevoBalanceConCobranza / burnRateDiario));

  // Step 5 Debt metrics
  const totalDeuda = useMemo(() => deudas.reduce((acc, d) => acc + d.monto, 0), [deudas]);
  const costoFinancieroActualPromedio = useMemo(() => {
    if (totalDeuda === 0) return 0;
    const ponderado = deudas.reduce((acc, d) => acc + d.monto * d.tasaAnual, 0);
    return ponderado / totalDeuda;
  }, [deudas, totalDeuda]);

  const interesAnualActual = (totalDeuda * costoFinancieroActualPromedio) / 100;
  const interesAnualRefinanciado = (totalDeuda * tasaRefinanciamiento) / 100;
  const ahorroInteresAnual = Math.max(0, interesAnualActual - interesAnualRefinanciado);
  const ahorroInteresMensual = ahorroInteresAnual / 12;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ------------------------------------------------------------- */}
      {/* HEADER BANNER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-purple-200 border border-white/10">
              <Brain className="w-3.5 h-3.5 text-amber-300" />
              <span>Motor de Decisiones Financieras &amp; Inteligencia de Caja</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Control de Caja &amp; Evaluador Inteligente de Compras / Inversiones
            </h2>
            <p className="text-purple-200/90 text-sm max-w-2xl leading-relaxed">
              Toma decisiones respaldadas por datos: evalúa compras, calcula la fecha exacta para pagar deudas y proyecta tu flujo de caja sin descapitalizar el negocio.
            </p>
          </div>

          {/* RUNWAY GAUGE BADGE */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 flex items-center gap-4 min-w-[250px]">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                runwayDias >= 60
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : runwayDias >= 25
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {runwayDias >= 60 ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : runwayDias >= 25 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-xs text-purple-200 font-medium">Runway de Caja Actual</p>
              <p className="text-2xl font-black font-mono">
                {runwayDias} <span className="text-xs font-normal text-purple-200">días</span>
              </p>
              <p className="text-[11px] text-purple-300 font-medium mt-0.5">
                {runwayDias >= 60
                  ? ' Saldo Protegido'
                  : runwayDias >= 25
                  ? '⚠️ Precaución (Revisar baches)'
                  : '🚨 Crítico (Ajuste Necesario)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DECISION ENGINE BAR & 5-STEP NAVIGATION CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setPasoActivo('decision_engine')}
          className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all shadow-sm ${
            pasoActivo === 'decision_engine'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20 ring-2 ring-amber-400/40'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Brain className="w-4 h-4 text-amber-300" />
          <span>🧠 MOTOR DE DECISIONES (Comprar / Invertir / Deudas)</span>
        </button>

        {[
          { paso: 1, num: '01', titulo: '1. Orden de Caja', sub: 'Runway & Liquidez', icon: Clock },
          { paso: 2, num: '02', titulo: '2. Proyección 4 Semanas', sub: 'Matriz & Baches', icon: TrendingUp },
          { paso: 3, num: '03', titulo: '3. Trabajamos Salidas', sub: 'Tijera Financiera', icon: Scissors },
          { paso: 4, num: '04', titulo: '4. Liberar Capital', sub: 'Stock & Cobranza', icon: Package },
          { paso: 5, num: '05', titulo: '5. Ordenar Deuda', sub: 'Reestructurar Pasivos', icon: Building2 },
        ].map(item => {
          const Icon = item.icon;
          const isSelected = pasoActivo === item.paso;
          return (
            <button
              key={item.paso}
              onClick={() => setPasoActivo(item.paso as any)}
              className={`px-4 py-2.5 rounded-2xl text-left border transition-all text-xs font-semibold flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.titulo}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* TAB DESTACADA: MOTOR DE INTELIGENCIA DE DECISIONES */}
      {/* ============================================================= */}
      {pasoActivo === 'decision_engine' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* SIMULADOR DE EVALUACIÓN DE COMPRAS E INVERSIONES */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Inteligencia Financiera — Evaluación de Inversión
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    ¿Puedo comprar o invertir en esto sin descapitalizarme?
                  </h3>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                Caja Disponible: <strong className="text-slate-900 font-mono">{formatCurrency(balanceTotal)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* FORM INPUTS */}
              <div className="space-y-4 md:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Concepto de Compra / Inversión
                  </label>
                  <input
                    type="text"
                    value={conceptoInversion}
                    onChange={e => setConceptoInversion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ej. Servidor, Contratación, Equipo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Monto Estimado de la Compra ($)
                  </label>
                  <input
                    type="number"
                    value={montoInversion}
                    onChange={e => setMontoInversion(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-lg font-black font-mono text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Modalidad de Pago
                  </label>
                  <select
                    value={modalidadInversion}
                    onChange={e => setModalidadInversion(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="CONTADO">Pago de Contado Inmediato (100% hoy)</option>
                    <option value="DIFERIDO_3">Diferido a 3 Pagos Mensuales</option>
                    <option value="DIFERIDO_6">Diferido a 6 Pagos Mensuales</option>
                  </select>
                </div>
              </div>

              {/* EVALUATION OUTPUT CARD */}
              <div className="md:col-span-2 space-y-4">
                <div
                  className={`p-6 rounded-3xl border space-y-4 shadow-sm transition-all ${
                    evaluacionInversion.dictamen === 'SEGURO'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : evaluacionInversion.dictamen === 'CONDICIONADO'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : 'bg-red-50/80 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider ${
                          evaluacionInversion.dictamen === 'SEGURO'
                            ? 'bg-emerald-600'
                            : evaluacionInversion.dictamen === 'CONDICIONADO'
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                        }`}
                      >
                        {evaluacionInversion.dictamen === 'SEGURO'
                          ? '🟢 COMPRA SEGURA & VIABLE'
                          : evaluacionInversion.dictamen === 'CONDICIONADO'
                          ? '🟡 VIABLE CON CONDICIÓN'
                          : '🔴 ALTO RIESGO / INVIABLE HOY'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
                      Impacto Inicial: {formatCurrency(evaluacionInversion.impactoInmediato)}
                    </span>
                  </div>

                  <p className="text-sm font-bold leading-relaxed">{evaluacionInversion.justificacion}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-semibold block">Fecha Sugerida para Ejecutar</span>
                      <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                        📅 {evaluacionInversion.fechaSugerida}
                      </span>
                    </div>

                    <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-xs text-slate-500 font-semibold block">Runway Resultante post-compra</span>
                      <span className="text-sm font-black font-mono text-indigo-900 mt-0.5 block">
                        {evaluacionInversion.nuevoRunway} días (antes: {runwayDias} días)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs space-y-1">
                  <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Recomendación del Copiloto Financiero:
                  </span>
                  <p className="text-slate-300">
                    Si decides efectuar la compra de <strong className="text-white">&ldquo;{conceptoInversion}&rdquo;</strong> por {formatCurrency(montoInversion)}, tu saldo neto disponible pasará a {formatCurrency(evaluacionInversion.nuevoBalance)}. Mantendrás reserva suficiente para operar sin sorpresas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PLANIFICADOR DE PAGO DE DEUDAS (¿CUÁNDO CONTAR CON EL DINERO?) */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl text-white shadow-md">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Planificador de Vencimientos &amp; Holgura
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    ¿Cuándo tendré el dinero seguro para pagar esta deuda o compromiso?
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4 md:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Deuda o Compromiso a Pagar
                  </label>
                  <input
                    type="text"
                    value={conceptoDeudaTarget}
                    onChange={e => setConceptoDeudaTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ej. Impuestos, Proveedor Core"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Monto de la Deuda ($)
                  </label>
                  <input
                    type="number"
                    value={montoDeudaTarget}
                    onChange={e => setMontoDeudaTarget(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-lg font-black font-mono text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="p-6 bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl space-y-4 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Dictamen de Fecha Óptima de Pago
                    </span>
                    <span className="text-xs font-mono bg-white/10 text-emerald-200 px-3 py-1 rounded-full border border-white/10">
                      Reserva de Operación Protegida: {formatCurrency(evaluacionPagoDeudaTarget.reservaMinima)}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="text-xs text-emerald-200 font-medium block">Fecha Recomendada de Pago:</span>
                    <p className="text-2xl font-black text-amber-300 mt-0.5">
                      🗓️ {evaluacionPagoDeudaTarget.fechaRecomendada}
                    </p>
                  </div>

                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {evaluacionPagoDeudaTarget.cubreDeudaHoy
                      ? `Dispones de ${formatCurrency(evaluacionPagoDeudaTarget.cajaDisponibleParaDeuda)} de caja libre tras proteger la nómina y gastos fijos del mes. Puedes liquidar "${conceptoDeudaTarget}" por ${formatCurrency(montoDeudaTarget)} hoy mismo.`
                      : `Actualmente la caja libre protegida es de ${formatCurrency(evaluacionPagoDeudaTarget.cajaDisponibleParaDeuda)}. Se sugiere liquidar la deuda en la Semana 2 para evitar tocar la reserva operativa.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 1: ORDENAMOS LA CAJA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 1 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold font-mono text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full">
                Paso 1 — Diagnóstico de Liquidez Inmediata
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Primer Paso: Ordenamos la Caja
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                No buscamos más plata ni vender más impulsivamente. Primero medimos con exactitud cuánto dinero entra, cuánto sale y cuándo.
              </p>
            </div>
            <div className="text-right bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
              <span className="text-xs font-semibold text-slate-500">Caja Disponible Actual</span>
              <p className="text-2xl font-black text-blue-700 font-mono">{formatCurrency(balanceTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-b from-blue-50/50 to-white p-6 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">¿Cuánto entra?</h4>
                  <p className="text-xs text-slate-500">Ingresos consolidados</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(ingresosMes)}</p>
                <p className="text-xs text-slate-500 mt-1">Ingresos registrados este mes</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Facturas pendientes:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(totalFacturasPendientes)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-purple-50/50 to-white p-6 rounded-2xl border border-purple-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">¿Cuánto sale?</h4>
                  <p className="text-xs text-slate-500">Egresos consolidados</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-2xl font-black text-red-500 font-mono">{formatCurrency(egresosMes)}</p>
                <p className="text-xs text-slate-500 mt-1">Egresos registrados este mes</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Tasa de Quema Diaria:</span>
                  <span className="font-bold text-red-600 font-mono">{formatCurrency(burnRateDiario)} /día</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-amber-50/50 to-white p-6 rounded-2xl border border-amber-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">¿Cuándo?</h4>
                  <p className="text-xs text-slate-500">Calendario &amp; Runway</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-2xl font-black text-indigo-700 font-mono">{runwayDias} días</p>
                <p className="text-xs text-slate-500 mt-1">Tiempo de vida garantizado sin ingresos</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Meses de Runway:</span>
                  <span className="font-bold text-indigo-900">{(runwayDias / 30).toFixed(1)} meses</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4" /> Diagnóstico del Experto Contable
              </div>
              <p className="text-sm font-medium text-slate-200 max-w-2xl">
                Al ritmo actual de egresos ({formatCurrency(burnRateDiario)}/día), la empresa tiene{' '}
                <strong className="text-amber-300 font-mono">{runwayDias} días de liquidez garantizada</strong>.
              </p>
            </div>
            <button
              onClick={() => setPasoActivo(2)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2"
            >
              Ir al Paso 2: Proyectar la Caja <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 2: PROYECTAMOS LA CAJA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 2 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold font-mono text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full">
                Paso 2 — Anticipar Baches Financieros
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Segundo Paso: Proyectamos la Caja a 4 Semanas
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Dejamos de decidir mirando el día a día. Armamos una proyección de flujo de fondos para los próximos meses para anticipar baches de caja.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Concepto / Período</th>
                  <th className="p-4 bg-slate-800 text-amber-300">Semana Actual (S0)</th>
                  <th className="p-4">Semana 1 (S1)</th>
                  <th className="p-4">Semana 2 (S2)</th>
                  <th className="p-4">Semana 3 (S3)</th>
                  <th className="p-4">Semana 4 (S4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="bg-emerald-50/40 font-semibold text-emerald-900">
                  <td className="p-4">(+) INGRESOS ESPERADOS (Cobranzas/Ventas)</td>
                  <td className="p-4 font-mono font-bold text-emerald-700">{formatCurrency(ingresosMes * 0.25)}</td>
                  <td className="p-4 font-mono text-emerald-700">{formatCurrency((totalFacturasPendientes * 0.4) + (ingresosMes * 0.25))}</td>
                  <td className="p-4 font-mono text-emerald-700">{formatCurrency(ingresosMes * 0.25)}</td>
                  <td className="p-4 font-mono text-emerald-700">{formatCurrency((totalFacturasPendientes * 0.3) + (ingresosMes * 0.25))}</td>
                  <td className="p-4 font-mono text-emerald-700">{formatCurrency(ingresosMes * 0.25)}</td>
                </tr>

                <tr className="bg-red-50/40 text-red-900">
                  <td className="p-4">(-) EGRESOS PROGRAMADOS (Nómina/Renta/Proveedores)</td>
                  <td className="p-4 font-mono font-bold text-red-600">{formatCurrency(egresosMes * 0.25)}</td>
                  <td className="p-4 font-mono text-red-600">{formatCurrency(egresosEsenciales * 0.5 + egresosReducibles * 0.25)}</td>
                  <td className="p-4 font-mono text-red-600">{formatCurrency(egresosMes * 0.25)}</td>
                  <td className="p-4 font-mono text-red-600">{formatCurrency(egresosEsenciales * 0.5 + egresosReducibles * 0.25)}</td>
                  <td className="p-4 font-mono text-red-600">{formatCurrency(egresosMes * 0.25)}</td>
                </tr>

                <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                  <td className="p-4 text-base">(=) SALDO NETO PROYECTADO DE CAJA</td>
                  {[
                    balanceTotal,
                    balanceTotal + (totalFacturasPendientes * 0.4) - (egresosEsenciales * 0.1),
                    balanceTotal + (totalFacturasPendientes * 0.4) - (egresosEsenciales * 0.2),
                    balanceTotal + (totalFacturasPendientes * 0.7) - (egresosEsenciales * 0.4),
                    balanceTotal + (totalFacturasPendientes * 0.7) - (egresosEsenciales * 0.5),
                  ].map((val, idx) => (
                    <td key={idx} className="p-4 font-mono text-base">
                      <span className={`px-2.5 py-1 rounded-xl ${val >= balanceTotal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                        {formatCurrency(val)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 3: TRABAJAMOS SOBRE LAS SALIDAS */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 3 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold font-mono text-purple-600 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full">
                Paso 3 — Clasificación Estratégica de Egresos
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Tercer Paso: Trabajamos sobre las Salidas
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                &ldquo;Cuando el flujo de caja es ajustado, no alcanza con vender más. También hay que saber qué dinero no debería estar saliendo.&rdquo;
              </p>
            </div>
          </div>

          <div className="bg-purple-900 text-white p-6 md:p-8 rounded-3xl space-y-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-700/50 rounded-2xl border border-purple-500/30">
                  <Scissors className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg">Simulador de Tijera Financiera (Recorte Inteligente)</h4>
                  <p className="text-xs text-purple-200">Ajusta el % de corte sobre egresos posponibles o eliminables</p>
                </div>
              </div>
              <span className="text-3xl font-black font-mono text-amber-300">{porcentajeCorteEgresos}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={porcentajeCorteEgresos}
              onChange={e => setPorcentajeCorteEgresos(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="text-xs text-purple-200 font-medium">Ahorro Mensual en Salidas</span>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{formatCurrency(ahorroEgresosMes)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="text-xs text-purple-200 font-medium">Nuevo Runway Proyectado</span>
                <p className="text-2xl font-black text-amber-300 font-mono mt-1">{nuevoRunwayDias} días</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <span className="text-xs text-purple-200 font-medium">Días Extra de Vida Ganados</span>
                <p className="text-2xl font-black text-white font-mono mt-1">+{diasGanadosRunway} días 🎉</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 4: LIBERAMOS PLATA INMOVILIZADA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 4 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold font-mono text-amber-600 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-full">
                Paso 4 — Descongelamiento de Capital
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Cuarto Paso: Liberamos Plata Inmovilizada
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                ¿Cómo convertimos cuentas por cobrar vencidas e inventario/servicios estancados en efectivo directo para la caja?
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 md:p-8 rounded-3xl space-y-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl border border-white/20">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg">Simulador de Recuperación de Cartera &amp; Stock</h4>
                  <p className="text-xs text-amber-100">% de cobranza proyectada de facturas pendientes ({formatCurrency(totalFacturasPendientes)})</p>
                </div>
              </div>
              <span className="text-3xl font-black font-mono text-white">{porcentajeCobranza}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={porcentajeCobranza}
              onChange={e => setPorcentajeCobranza(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-amber-900/40 rounded-lg appearance-none cursor-pointer accent-white"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <span className="text-xs text-amber-100 font-medium">Inyección Directa a Caja por Cobranza</span>
                <p className="text-2xl font-black text-white font-mono mt-1">+{formatCurrency(dineroLiberadoCobranza)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <span className="text-xs text-amber-100 font-medium">Nuevo Runway con Cartera Cobrada</span>
                <p className="text-2xl font-black text-amber-200 font-mono mt-1">{runwayConCobranzaDias} días de vida 🎉</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 5: ORDENAMOS LA DEUDA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 5 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full">
                Paso 5 — Diagnóstico de Pasivos &amp; Refinanciación
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                Quinto Paso: Ordenamos la Deuda
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                No se trata de refinanciar y patear el problema. Analizamos cada deuda, su costo financiero (CFT) y su impacto en la caja.
              </p>
            </div>
          </div>

          <div className="bg-emerald-950 text-white p-6 md:p-8 rounded-3xl space-y-6 shadow-xl border border-emerald-800/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800/80 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Estrategia de Sustitución de Deuda
                </span>
                <h4 className="text-xl font-extrabold mt-0.5">
                  Reemplazar Deuda Cara por Préstamo Estructurado a Cuota Fija Más Baja
                </h4>
              </div>
              <div className="flex items-center gap-2 bg-emerald-900 px-4 py-2 rounded-xl border border-emerald-700">
                <span className="text-xs text-emerald-200">Tasa Crédito Consolidado:</span>
                <input
                  type="number"
                  value={tasaRefinanciamiento}
                  onChange={e => setTasaRefinanciamiento(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-emerald-950 text-white font-mono font-bold text-sm border border-emerald-600 rounded outline-none text-center"
                />
                <span className="text-xs text-emerald-200">%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <span className="text-xs text-emerald-200 font-medium">Costo Financiero Promedio Actual</span>
                <p className="text-2xl font-black text-red-400 font-mono mt-1">
                  {costoFinancieroActualPromedio.toFixed(1)}% anual
                </p>
              </div>

              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <span className="text-xs text-emerald-200 font-medium">Nuevo Costo Refinanciado</span>
                <p className="text-2xl font-black text-emerald-300 font-mono mt-1">{tasaRefinanciamiento}% anual</p>
              </div>

              <div className="p-4 bg-emerald-900/80 backdrop-blur-md rounded-2xl border border-emerald-500/50">
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">Ahorro Neto Estimado</span>
                <p className="text-2xl font-black text-amber-300 font-mono mt-1">
                  {formatCurrency(ahorroInteresMensual)} /mes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
