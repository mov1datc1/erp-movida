export type TipoMovimientoGasto = 'EGRESO' | 'INGRESO';

export type EstadoComprobanteGasto = 'PENDIENTE' | 'CONCILIADO' | 'DESCARTADO';

export interface ExtraccionComprobante {
  tipo: TipoMovimientoGasto;
  monto: number;
  moneda: string;
  fecha: string;
  hora?: string;
  destinatario: string;
  titular_enrolado?: string;
  pagador_o_remitente?: string;
  medio_pago: string;
  banco?: string;
  referencia?: string;
  nota_whatsapp?: string;
  resumen_ejecutivo: string;
  proveedor_sugerido?: string;
  cliente_sugerido?: string;
  proyecto_sugerido?: string;
  categoria_sugerida?: string;
  confianza: number;
}

export interface ComprobanteGastoView {
  id: string;
  folio: string;
  tipo: TipoMovimientoGasto;
  monto: number;
  moneda: string;
  monto_usd?: number;
  fecha: string;
  hora?: string;
  destinatario: string;
  titular_enrolado?: string;
  pagador: string;
  medio_pago: string;
  banco?: string;
  referencia: string;
  nota_whatsapp?: string;
  remitente_chat?: string;
  chat_origen?: string;
  imagen_url?: string;
  resumen_ejecutivo: string;
  estado: EstadoComprobanteGasto;
  confianza: number;
  
  // Conciliación
  cuenta_por_pagar_id?: string;
  cuenta_por_pagar_folio?: string;
  movimiento_financiero_id?: string;
  proveedor_id?: string;
  proveedor_nombre?: string;
  proyecto_id?: string;
  proyecto_nombre?: string;
  
  creadoEn: string;
  conciliadoEn?: string;
  conciliadoPor?: string;
}

export interface GastosBuzonStore {
  comprobantes: ComprobanteGastoView[];
  webhookConfig?: {
    verifyToken: string;
    phoneNumberId?: string;
    wabaId?: string;
    numeroTecnico?: string;
    activo: boolean;
  };
}
