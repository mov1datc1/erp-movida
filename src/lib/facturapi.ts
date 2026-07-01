import Facturapi from 'facturapi';
import prisma from './prisma';

export async function getFacturapiClient() {
  const config = await prisma.integracionConfig.findFirst();
  if (!config) throw new Error("Configuración de integraciones no encontrada");
  
  if (!config.facturapi_enabled) {
    throw new Error("La facturación electrónica está deshabilitada en el sistema.");
  }

  // Si está en producción, se usa la llave Live, si no, la Test.
  // Por ahora podemos poner una lógica sencilla basada en NODE_ENV o un flag, 
  // pero asumiremos que si hay un environment var O si queremos usar TEST por defecto
  const isProduction = process.env.NODE_ENV === 'production';
  const apiKey = isProduction ? config.facturapi_live_key : config.facturapi_test_key;

  if (!apiKey) {
    throw new Error(`No hay llave de Facturapi configurada para el entorno ${isProduction ? 'Live' : 'Test'}.`);
  }

  return new Facturapi(apiKey);
}
