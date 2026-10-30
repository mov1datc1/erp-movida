'use server';

import { revalidatePath } from 'next/cache';
import {
  getGastosStore,
  analizarComprobanteConVision,
  registrarComprobantesExtraidos,
  conciliarComprobante,
  descartarComprobante,
  reactivarComprobante,
} from '@/lib/gastosAgent';
import { ComprobanteGastoView, GastosBuzonStore } from '@/types/gastosAgent';

export async function cargarBuzonGastosAction(): Promise<GastosBuzonStore> {
  return await getGastosStore();
}

export async function analizarYRegistrarComprobanteAction(params: {
  imageBase64: string;
  mimeType?: string;
  notaContexto?: string;
  remitente?: string;
  chatNombre?: string;
}): Promise<{ success: boolean; comprobantes?: ComprobanteGastoView[]; error?: string }> {
  try {
    if (!params.imageBase64) {
      return { success: false, error: 'No se proporcionó imagen para analizar.' };
    }

    const extracciones = await analizarComprobanteConVision({
      imageBase64: params.imageBase64,
      mimeType: params.mimeType,
      notaContexto: params.notaContexto,
      remitente: params.remitente,
      chatNombre: params.chatNombre,
    });

    if (!extracciones || extracciones.length === 0) {
      return { success: false, error: 'El agente de visión no detectó ningún comprobante financiero válido en la imagen.' };
    }

    const registrados = await registrarComprobantesExtraidos({
      extracciones,
      imagenUrl: params.imageBase64.startsWith('data:') ? params.imageBase64 : `data:${params.mimeType || 'image/jpeg'};base64,${params.imageBase64}`,
      chatNombre: params.chatNombre || 'WhatsApp Buzón',
      remitente: params.remitente || 'Ricardo Zerpa / Chat Movida',
    });

    revalidatePath('/contable');
    return { success: true, comprobantes: registrados };
  } catch (error: any) {
    console.error('Error en analizarYRegistrarComprobanteAction:', error);
    return { success: false, error: error.message || 'Error analizando comprobante con IA.' };
  }
}

export async function conciliarComprobanteAction(params: {
  comprobanteId: string;
  cuentaPorPagarId?: string;
  crearMovimientoFinanciero?: boolean;
  categoria?: string;
  usuario?: string;
  proyectoId?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await conciliarComprobante(params);
    revalidatePath('/contable');
    return { success: true, message: res.message };
  } catch (error: any) {
    console.error('Error en conciliarComprobanteAction:', error);
    return { success: false, error: error.message || 'Error conciliando comprobante.' };
  }
}

export async function descartarComprobanteAction(
  comprobanteId: string,
  motivo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await descartarComprobante(comprobanteId, motivo);
    revalidatePath('/contable');
    return { success: true };
  } catch (error: any) {
    console.error('Error en descartarComprobanteAction:', error);
    return { success: false, error: error.message || 'Error descartando comprobante.' };
  }
}

export async function reactivarComprobanteAction(
  comprobanteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await reactivarComprobante(comprobanteId);
    revalidatePath('/contable');
    return { success: true };
  } catch (error: any) {
    console.error('Error en reactivarComprobanteAction:', error);
    return { success: false, error: error.message || 'Error reactivando comprobante.' };
  }
}
