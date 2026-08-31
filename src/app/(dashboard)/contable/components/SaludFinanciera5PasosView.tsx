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
  XCircle,
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
  Info,
  Calendar,
  Layers,
  Check,
  Receipt,
  FileCheck,
  TrendingDown
} from 'lucide-react';
import { startOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';

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
  facturasCobrar?: any[];
  cuentasPorPagar?: any[];
  rawMovimientos?: any[];
  proyectos?: any[];
}

export function SaludFinanciera5PasosView({
  movimientos,
  balanceTotal,
  ingresosMes,
  egresosMes,
  facturasPendientes = [],
  facturasCobrar = [],
  cuentasPorPagar = [],
  proyectos = []
}: Props) {
  const [pasoActivo, setPasoActivo] = useState<1 | 2 | 3 | 4 | 5 | 'decision_engine'>('decision_engine');

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
    { id: '1', concepto: 'Recargos Fiscales / Impuestos Vencidos', monto: 85000, tasaAnual: 36, tipo: 'Fiscal' },
    { id: '2', concepto: 'Tarjeta de Crédito Corporativa', monto: 45000, tasaAnual: 48, tipo: 'Bancario' },
    { id: '3', concepto: 'Proveedor Insumos (Vencido)', monto: 62000, tasaAnual: 18, tipo: 'Comercial' },
  ]);
  const [tasaRefinanciamiento, setTasaRefinanciamiento] = useState<number>(14);

  // -------------------------------------------------------------
  // INTEGRATED ACCOUNTS RECEIVABLE (FACTURAS COBRAR) WITH PARTIAL PAYMENTS
  // -------------------------------------------------------------
  const facturasCobrarStats = useMemo(() => {
    const invoices = facturasCobrar.length > 0 ? facturasCobrar : facturasPendientes;
    let montoTotalFacturado = 0;
    let montoPagadoAcumulado = 0;
    let saldoPendienteCobro = 0;

    invoices.forEach(f => {
      const total = f.monto_total || f.monto || 0;
      const pagado = f.monto_pagado || 0;
      const saldo = Math.max(0, total - pagado);

      montoTotalFacturado += total;
      montoPagadoAcumulado += pagado;
      saldoPendienteCobro += saldo;
    });

    const conPagoParcial = invoices.filter(f => f.estatus === 'PAGADA_PARCIALMENTE');

    return {
      invoices,
      montoTotalFacturado,
      montoPagadoAcumulado,
      saldoPendienteCobro,
      conPagoParcial,
    };
  }, [facturasCobrar, facturasPendientes]);

  // -------------------------------------------------------------
  // INTEGRATED ACCOUNTS PAYABLE (CUENTAS POR PAGAR) WITH PARTIAL PAYMENTS
  // -------------------------------------------------------------
  const cuentasPorPagarStats = useMemo(() => {
    let montoTotalEgresos = 0;
    let montoPagadoProveedorAcumulado = 0;
    let saldoPendientePago = 0;

    cuentasPorPagar.forEach(c => {
      const total = c.monto_total || c.monto || 0;
      const pagado = c.monto_pagado || 0;
      const saldo = Math.max(0, total - pagado);

      montoTotalEgresos += total;
      montoPagadoProveedorAcumulado += pagado;
      saldoPendientePago += saldo;
    });

    const conPagoParcial = cuentasPorPagar.filter(c => c.estatus === 'PAGADA_PARCIALMENTE');

    return {
      cuentasPorPagar,
      montoTotalEgresos,
      montoPagadoProveedorAcumulado,
      saldoPendientePago,
      conPagoParcial,
    };
  }, [cuentasPorPagar]);

  // -------------------------------------------------------------
  // CALCULATED METRICS
  // -------------------------------------------------------------
  const burnRateDiario = useMemo(() => {
    return egresosMes > 0 ? egresosMes / 30 : 1;
  }, [egresosMes]);

  const runwayDias = useMemo(() => {
    if (burnRateDiario <= 0) return 999;
    return Math.max(0, Math.round(balanceTotal / burnRateDiario));
  }, [balanceTotal, burnRateDiario]);

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
  // WEEKLY CASHFLOW PROJECTION BY REAL DUE DATES (S0 - S4)
  // -------------------------------------------------------------
  const matrizSemanalesReal = useMemo(() => {
    const today = new Date();
    const startS0 = startOfWeek(today, { weekStartsOn: 1 });

    const weeks = Array.from({ length: 5 }, (_, i) => {
      const start = addWeeks(startS0, i);
      const end = addWeeks(start, 1);
      return { index: i, start, end, ingresosFacturas: 0, egresosCuentas: 0 };
    });

    // Group receivables by due date
    facturasCobrarStats.invoices.forEach(f => {
      const saldo = Math.max(0, (f.monto_total || f.monto || 0) - (f.monto_pagado || 0));
      if (saldo <= 0) return;

      const fVenc = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : today;
      const matchingWeek = weeks.find(w => fVenc >= w.start && fVenc < w.end);
      if (matchingWeek) {
        matchingWeek.ingresosFacturas += saldo;
      } else {
        // Fallback to S1 if due soon or overdue
        weeks[1].ingresosFacturas += saldo * 0.5;
        weeks[2].ingresosFacturas += saldo * 0.5;
      }
    });

    // Group payables by due date
    cuentasPorPagarStats.cuentasPorPagar.forEach(c => {
      const saldo = Math.max(0, (c.monto_total || c.monto || 0) - (c.monto_pagado || 0));
      if (saldo <= 0) return;

      const fVenc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : today;
      const matchingWeek = weeks.find(w => fVenc >= w.start && fVenc < w.end);
      if (matchingWeek) {
        matchingWeek.egresosCuentas += saldo;
      } else {
        weeks[1].egresosCuentas += saldo * 0.5;
        weeks[2].egresosCuentas += saldo * 0.5;
      }
    });

    // Calculate cumulative cash position
    let runningBalance = balanceTotal;
    return weeks.map(w => {
      const ing = w.ingresosFacturas > 0 ? w.ingresosFacturas : (ingresosMes * 0.25);
      const egr = w.egresosCuentas > 0 ? w.egresosCuentas : (egresosMes * 0.25);
      runningBalance = runningBalance + ing - egr;
      return {
        ...w,
        ingresosTotal: ing,
        egresosTotal: egr,
        saldoAcumulado: runningBalance,
      };
    });
  }, [facturasCobrarStats, cuentasPorPagarStats, balanceTotal, ingresosMes, egresosMes]);

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
      fechaSugerida = 'Disponible hoy mismo (disponibilidad inmediata de efectivo)';
    } else if (nuevoRunway >= 20) {
      dictamen = 'CONDICIONADO';
      justificacion = `Factible pero reduce el Runway a ${nuevoRunway} días. Se recomienda diferir a cuotas o cobrar el 40% de los ${formatCurrency(facturasCobrarStats.saldoPendienteCobro)} pendientes por cobrar primero.`;
      fechaSugerida = 'En 10 a 14 días (tras cobranza de facturas del pipeline)';
    } else {
      dictamen = 'INVIABLE';
      justificacion = `Riesgo alto de bache de caja. Esta compra descapitalizaría la empresa en menos de 20 días al considerar las cuentas por pagar comprometidas (${formatCurrency(cuentasPorPagarStats.saldoPendientePago)}).`;
      fechaSugerida = 'En 30 a 45 días (o diferir a 6 meses con anticipo menor al 15%)';
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
  }, [balanceTotal, burnRateDiario, egresosEsenciales, montoInversion, modalidadInversion, facturasCobrarStats, cuentasPorPagarStats]);

  // Debt Payoff Evaluator
  const evaluacionPagoDeudaTarget = useMemo(() => {
    const reservaMinima = egresosEsenciales * 0.4 + cuentasPorPagarStats.saldoPendientePago * 0.5;
    const cajaDisponibleParaDeuda = Math.max(0, balanceTotal - reservaMinima);
    const cubreDeudaHoy = cajaDisponibleParaDeuda >= montoDeudaTarget;

    const fechaRecomendada = cubreDeudaHoy
      ? 'Disponible HOY (fondos suficientes y cuentas por pagar resguardadas)'
      : 'Semana 2 (tras ingresar cobros pendientes del pipeline)';

    return {
      reservaMinima,
      cajaDisponibleParaDeuda,
      cubreDeudaHoy,
      fechaRecomendada,
    };
  }, [balanceTotal, egresosEsenciales, montoDeudaTarget, cuentasPorPagarStats]);

  // Step 3 Simulation calculations
  const ahorroEgresosMes = (egresosReducibles * porcentajeCorteEgresos) / 100;
  const nuevoEgresoMes = egresosMes - ahorroEgresosMes;
  const nuevoBurnRate = nuevoEgresoMes > 0 ? nuevoEgresoMes / 30 : 1;
  const nuevoRunwayDias = Math.max(0, Math.round(balanceTotal / nuevoBurnRate));
  const diasGanadosRunway = nuevoRunwayDias - runwayDias;

  // Step 4 Simulation calculations
  const dineroLiberadoCobranza = (facturasCobrarStats.saldoPendienteCobro * porcentajeCobranza) / 100;
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
      {/* HEADER BANNER - MOVIDA ERP BRANDING */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-2xl p-6 md:p-8 text-white shadow-sm border border-blue-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-blue-100 border border-white/10">
              <Brain className="w-3.5 h-3.5 text-blue-300" />
              <span>Inteligencia de Caja Integrada (Cobrar + Pagar + Movimientos)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Salud Financiera &amp; Evaluador de Decisiones
            </h2>
            <p className="text-blue-100/90 text-sm max-w-2xl leading-relaxed">
              Integrado con facturas por cobrar (incluyendo pagos parciales), cuentas por pagar a proveedores y fechas reales de vencimiento.
            </p>
          </div>

          {/* RUNWAY GAUGE BADGE */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 shrink-0 flex items-center gap-4 min-w-[240px]">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                runwayDias >= 60
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : runwayDias >= 25
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {runwayDias >= 60 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : runwayDias >= 25 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Runway de Caja Actual</p>
              <p className="text-2xl font-bold font-mono">
                {runwayDias} <span className="text-xs font-normal text-blue-200">días</span>
              </p>
              <p className="text-[11px] text-blue-200 font-medium mt-0.5">
                {runwayDias >= 60
                  ? 'Liquidez Estable'
                  : runwayDias >= 25
                  ? 'Precaución (Bache cercano)'
                  : 'Atención (Requiere ajuste)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RESUMEN DE INTEGRACIÓN DE CARTERA & PROVEEDORES */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CUENTAS POR COBRAR INTEGRADAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-slate-800 text-sm">Cuentas por Cobrar (Facturación)</h4>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {facturasCobrarStats.invoices.length} Facturas Activas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Saldo Pendiente de Cobro</span>
              <span className="text-lg font-bold font-mono text-emerald-700 block">
                {formatCurrency(facturasCobrarStats.saldoPendienteCobro)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Cobrado Parcialmente</span>
              <span className="text-lg font-bold font-mono text-slate-700 block">
                {formatCurrency(facturasCobrarStats.montoPagadoAcumulado)}
              </span>
            </div>
          </div>

          {facturasCobrarStats.conPagoParcial.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200/80">
              <span className="font-semibold text-slate-700 block">Facturas con Abonos Parciales:</span>
              {facturasCobrarStats.conPagoParcial.map((f: any) => (
                <div key={f.id} className="flex justify-between text-slate-600">
                  <span className="truncate max-w-[180px]">• {f.folio} - {f.cliente?.nombre || 'Cliente'}</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    Abonado: {formatCurrency(f.monto_pagado || 0)} / Riego: {formatCurrency((f.monto_total || 0) - (f.monto_pagado || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CUENTAS POR PAGAR INTEGRADAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-600" />
              <h4 className="font-bold text-slate-800 text-sm">Cuentas por Pagar (Proveedores)</h4>
            </div>
            <span className="text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
              {cuentasPorPagarStats.cuentasPorPagar.length} Egresos Pendientes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Saldo Pendiente de Pago</span>
              <span className="text-lg font-bold font-mono text-red-600 block">
                {formatCurrency(cuentasPorPagarStats.saldoPendientePago)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Pagado a Proveedores</span>
              <span className="text-lg font-bold font-mono text-slate-700 block">
                {formatCurrency(cuentasPorPagarStats.montoPagadoProveedorAcumulado)}
              </span>
            </div>
          </div>

          {cuentasPorPagarStats.conPagoParcial.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200/80">
              <span className="font-semibold text-slate-700 block">Cuentas con Abonos Parciales:</span>
              {cuentasPorPagarStats.conPagoParcial.map((c: any) => (
                <div key={c.id} className="flex justify-between text-slate-600">
                  <span className="truncate max-w-[180px]">• {c.folio} - {c.proveedor?.nombre || 'Proveedor'}</span>
                  <span className="font-mono text-red-600 font-bold">
                    Abonado: {formatCurrency(c.monto_pagado || 0)} / Resta: {formatCurrency((c.monto_total || 0) - (c.monto_pagado || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS - BRANDING BLUE */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setPasoActivo('decision_engine')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            pasoActivo === 'decision_engine'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Motor de Decisiones (Comprar / Deudas)</span>
        </button>

        {[
          { paso: 1, num: '01', titulo: '1. Orden de Caja', icon: Clock },
          { paso: 2, num: '02', titulo: '2. Proyección 4 Semanas', icon: TrendingUp },
          { paso: 3, num: '03', titulo: '3. Optimizar Salidas', icon: Scissors },
          { paso: 4, num: '04', titulo: '4. Liberar Capital', icon: Package },
          { paso: 5, num: '05', titulo: '5. Ordenar Deuda', icon: Building2 },
        ].map(item => {
          const Icon = item.icon;
          const isSelected = pasoActivo === item.paso;
          return (
            <button
              key={item.paso}
              onClick={() => setPasoActivo(item.paso as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.titulo}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* TAB DESTACADA: MOTOR DE INTELIGENCIA DE DECISIONES */}
      {/* ============================================================= */}
      {pasoActivo === 'decision_engine' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* SIMULADOR DE EVALUACIÓN DE COMPRAS E INVERSIONES */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Evaluación de Inversión y Compras
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    ¿Puedo comprar o invertir en esto sin descapitalizarme?
                  </h3>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Caja Disponible: <strong className="text-slate-900 font-mono">{formatCurrency(balanceTotal)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* FORM INPUTS */}
              <div className="space-y-4 md:col-span-1 bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Concepto de Compra / Inversión
                  </label>
                  <input
                    type="text"
                    value={conceptoInversion}
                    onChange={e => setConceptoInversion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-700"
                    placeholder="Ej. Servidor, Equipo, Licencias"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-900 outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Modalidad de Pago
                  </label>
                  <select
                    value={modalidadInversion}
                    onChange={e => setModalidadInversion(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-700"
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
                  className={`p-5 rounded-xl border space-y-3 transition-all ${
                    evaluacionInversion.dictamen === 'SEGURO'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : evaluacionInversion.dictamen === 'CONDICIONADO'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-red-50/70 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {evaluacionInversion.dictamen === 'SEGURO' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      )}
                      {evaluacionInversion.dictamen === 'CONDICIONADO' && (
                        <AlertTriangle className="w-5 h-5 text-amber-700" />
                      )}
                      {evaluacionInversion.dictamen === 'INVIABLE' && (
                        <XCircle className="w-5 h-5 text-red-700" />
                      )}
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          evaluacionInversion.dictamen === 'SEGURO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evaluacionInversion.dictamen === 'CONDICIONADO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {evaluacionInversion.dictamen === 'SEGURO'
                          ? 'Compra Segura & Viable'
                          : evaluacionInversion.dictamen === 'CONDICIONADO'
                          ? 'Viable con Condición'
                          : 'Alto Riesgo / Inviable Hoy'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      Impacto Inicial: {formatCurrency(evaluacionInversion.impactoInmediato)}
                    </span>
                  </div>

                  <p className="text-xs font-medium leading-relaxed">{evaluacionInversion.justificacion}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Fecha Sugerida para Ejecutar</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        {evaluacionInversion.fechaSugerida}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Runway Resultante post-compra</span>
                      <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">
                        {evaluacionInversion.nuevoRunway} días (antes: {runwayDias} días)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                  <span className="text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Recomendación Financiera:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Si ejecutas la compra de <strong className="text-white">&ldquo;{conceptoInversion}&rdquo;</strong> por {formatCurrency(montoInversion)}, tu caja disponible proyectada será de {formatCurrency(evaluacionInversion.nuevoBalance)}. Tu operación habitual no se verá afectada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PLANIFICADOR DE PAGO DE DEUDAS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Planificador de Vencimientos
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    ¿Cuándo tendré el dinero seguro para pagar esta deuda o compromiso?
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4 md:col-span-1 bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Deuda o Compromiso a Pagar
                  </label>
                  <input
                    type="text"
                    value={conceptoDeudaTarget}
                    onChange={e => setConceptoDeudaTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-700"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-900 outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="p-5 bg-slate-900 text-white rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      Fecha Óptima Recomendada
                    </span>
                    <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                      Reserva Operativa Protegida: {formatCurrency(evaluacionPagoDeudaTarget.reservaMinima)}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="text-xs text-slate-400 font-medium block">Fecha Óptima sugerida por el sistema:</span>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      {evaluacionPagoDeudaTarget.fechaRecomendada}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {evaluacionPagoDeudaTarget.cubreDeudaHoy
                      ? `Cuenta con ${formatCurrency(evaluacionPagoDeudaTarget.cajaDisponibleParaDeuda)} de caja libre tras resguardar los costos fijos y cuentas por pagar vencidas. Es seguro liquidar "${conceptoDeudaTarget}" por ${formatCurrency(montoDeudaTarget)}.`
                      : `La caja libre tras reserva es de ${formatCurrency(evaluacionPagoDeudaTarget.cajaDisponibleParaDeuda)}. Se recomienda programar el pago en la Semana 2 tras recibir la cobranza en curso.`}
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Paso 1 — Diagnóstico de Liquidez Inmediata
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                Primer Paso: Ordenamos la Caja
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluación previa del flujo de ingresos, egresos y el plazo de cobranza.
              </p>
            </div>
            <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Caja Disponible Actual</span>
              <p className="text-xl font-bold text-blue-900 font-mono">{formatCurrency(balanceTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">¿Cuánto entra?</h4>
                  <p className="text-[11px] text-slate-500">Ingresos del período</p>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(ingresosMes)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ingresos registrados este mes</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Facturas pendientes:</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(facturasCobrarStats.saldoPendienteCobro)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">¿Cuánto sale?</h4>
                  <p className="text-[11px] text-slate-500">Egresos del período</p>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-red-600 font-mono">{formatCurrency(egresosMes)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Egresos registrados este mes</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Cuentas por pagar:</span>
                  <span className="font-bold text-red-600 font-mono">{formatCurrency(cuentasPorPagarStats.saldoPendientePago)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">¿Cuándo?</h4>
                  <p className="text-[11px] text-slate-500">Días de Runway</p>
                </div>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-mono">{runwayDias} días</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tiempo de operación garantizada</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Equivalente:</span>
                  <span className="font-bold text-slate-800 font-mono">{(runwayDias / 30).toFixed(1)} meses</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 text-white rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-blue-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Diagnóstico Financiero Integrado
              </span>
              <p className="text-xs text-slate-300 max-w-2xl">
                Al ritmo actual de egresos ({formatCurrency(burnRateDiario)}/día), la empresa cuenta con{' '}
                <strong className="text-white font-mono">{runwayDias} días de liquidez garantizada</strong>. Facturas por cobrar netas: {formatCurrency(facturasCobrarStats.saldoPendienteCobro)} | Cuentas por pagar netas: {formatCurrency(cuentasPorPagarStats.saldoPendientePago)}.
              </p>
            </div>
            <button
              onClick={() => setPasoActivo(2)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg transition-all shrink-0 flex items-center gap-1.5"
            >
              Ir al Paso 2: Proyectar Caja <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 2: PROYECTAMOS LA CAJA (MATRIZ POR FECHAS REALES) */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Paso 2 — Proyección por Fechas de Vencimiento
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                Segundo Paso: Proyectamos la Caja a 4 Semanas con Fechas Reales
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculado a partir de las fechas de vencimiento de tus facturas por cobrar y cuentas por pagar a proveedores.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Concepto / Período</th>
                  {matrizSemanalesReal.map((w, idx) => (
                    <th key={idx} className={`p-3 ${idx === 0 ? 'bg-slate-200 text-slate-900 font-bold' : ''}`}>
                      {idx === 0 ? 'Semana Actual (S0)' : `Semana ${idx} (S${idx})`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="bg-emerald-50/30 text-emerald-950">
                  <td className="p-3 font-semibold text-slate-800">(+) Cobranza Real Proyectada (Facturas)</td>
                  {matrizSemanalesReal.map((w, idx) => (
                    <td key={idx} className="p-3 font-mono text-emerald-700 font-bold">
                      {formatCurrency(w.ingresosTotal)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-red-50/30 text-red-950">
                  <td className="p-3 font-semibold text-slate-800">(-) Pagos Obligatorios Proyectados (Proveedores)</td>
                  {matrizSemanalesReal.map((w, idx) => (
                    <td key={idx} className="p-3 font-mono text-red-600 font-bold">
                      {formatCurrency(w.egresosTotal)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td className="p-3 text-slate-900">(=) Saldo Neto Proyectado de Caja</td>
                  {matrizSemanalesReal.map((w, idx) => (
                    <td key={idx} className="p-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          w.saldoAcumulado >= balanceTotal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {formatCurrency(w.saldoAcumulado)}
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Paso 3 — Optimización de Gastos
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                Tercer Paso: Trabajamos sobre las Salidas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clasificación de egresos esenciales e identificación de partidas prescindibles.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                  <Scissors className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Simulador de Recorte de Gastos Reducibles</h4>
                  <p className="text-xs text-slate-400">Ajusta el % de optimización sobre egresos prescindibles</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono text-blue-300">{porcentajeCorteEgresos}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={porcentajeCorteEgresos}
              onChange={e => setPorcentajeCorteEgresos(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Ahorro Mensual Proyectado</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{formatCurrency(ahorroEgresosMes)}</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Nuevo Runway Proyectado</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{nuevoRunwayDias} días</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Días Extra Ganados</span>
                <p className="text-lg font-bold text-blue-300 font-mono mt-0.5">+{diasGanadosRunway} días</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 4: LIBERAMOS PLATA INMOVILIZADA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Paso 4 — Recuperación de Activos
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                Cuarto Paso: Liberamos Plata Inmovilizada
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Estrategias para acelerar la cobranza de facturas vencidas e inventario sin rotación.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                  <Package className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Simulador de Cobranza Acelerada</h4>
                  <p className="text-xs text-slate-400">Total Facturas Pendientes Netas: {formatCurrency(facturasCobrarStats.saldoPendienteCobro)}</p>
                </div>
              </div>
              <span className="text-2xl font-bold font-mono text-blue-300">{porcentajeCobranza}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={porcentajeCobranza}
              onChange={e => setPorcentajeCobranza(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Inyección de Liquidez por Cobranza</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">+{formatCurrency(dineroLiberadoCobranza)}</p>
              </div>
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Nuevo Runway con Cartera Cobrada</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{runwayConCobranzaDias} días de liquidez</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PASO 5: ORDENAMOS LA DEUDA */}
      {/* ------------------------------------------------------------- */}
      {pasoActivo === 5 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Paso 5 — Diagnóstico y Reestructuración
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                Quinto Paso: Ordenamos la Deuda
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Análisis de costo financiero y sustitución de pasivos de alta tasa.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                  Consolidación de Deuda
                </span>
                <h4 className="text-base font-bold mt-0.5">
                  Sustitución de Pasivos por Crédito Estructurado a Tasa Menor
                </h4>
              </div>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-300">Tasa Crédito Consolidado:</span>
                <input
                  type="number"
                  value={tasaRefinanciamiento}
                  onChange={e => setTasaRefinanciamiento(parseFloat(e.target.value) || 0)}
                  className="w-14 px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs border border-slate-700 rounded outline-none text-center"
                />
                <span className="text-xs text-slate-300">%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Costo Financiero Promedio Actual</span>
                <p className="text-lg font-bold text-red-400 font-mono mt-0.5">
                  {costoFinancieroActualPromedio.toFixed(1)}% anual
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Nuevo Costo Refinanciado</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{tasaRefinanciamiento}% anual</p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Ahorro Neto Estimado</span>
                <p className="text-lg font-bold text-blue-300 font-mono mt-0.5">
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
