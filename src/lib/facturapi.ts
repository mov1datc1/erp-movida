import Facturapi from 'facturapi';
import { prisma } from '@/lib/prisma';

export async function getFacturapiClient() {
  const integracion = await prisma.integracion.findUnique({
    where: { proveedor: 'FACTURAPI' }
  });

  if (!integracion) throw new Error("Configuración de integraciones no encontrada");
  
  if (!integracion.activa) {
    throw new Error("La facturación electrónica está deshabilitada en el sistema.");
  }

  const config = integracion.config as { live_key?: string, test_key?: string };

  // Si está en producción, se usa la llave Live, si no, la Test.
  const isProduction = process.env.NODE_ENV === 'production';
  const apiKey = isProduction ? config.live_key : config.test_key;

  if (!apiKey) {
    throw new Error(`No hay llave de Facturapi configurada para el entorno ${isProduction ? 'Live' : 'Test'}.`);
  }

  return new Facturapi(apiKey);
}
