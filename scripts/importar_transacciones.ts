import { SentidoMovimiento, TipoFlujo, FacturaStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';

// Helper to parse DD/MM/YY to Date
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return null;
}

// Helper to parse amounts like "$2.500,00" or "-$13,64" or "" to float
function parseAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove '$', spaces, and '.' used as thousands separator
  let clean = amountStr.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '');
  // Replace ',' with '.' for decimal
  clean = clean.replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function main() {
  console.log('Iniciando importación ETL de CSV...');

  // Cleanup from previous runs
  console.log('Limpiando importaciones previas...');
  await prisma.movimientoFinanciero.deleteMany({ where: { descripcion: { contains: 'Importado de CSV' } } }).catch(() => {});
  await prisma.factura.deleteMany({ where: { descripcion: { contains: 'Importado de CSV' } } });
  await prisma.cuentaPorPagar.deleteMany({ where: { descripcion: { contains: 'Importado de CSV' } } });
  
  const dataDir = path.resolve(process.cwd(), '../datos_historicos');
  if (!fs.existsSync(dataDir)) {
    console.error(`No se encontró el directorio: ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv'));
  if (files.length === 0) {
    console.log(`No hay archivos CSV en ${dataDir}`);
    return;
  }

  // Load existing clients and providers
  const allClientes = await prisma.cliente.findMany();
  const allProveedores = await prisma.proveedor.findMany();

  let insertCount = 0;

  for (const file of files) {
    const csvPath = path.join(dataDir, file);
    console.log(`Procesando archivo: ${file}...`);
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
    if (!line.startsWith('I;') && !line.startsWith('E;')) continue;
    
    const cols = line.split(';');
    
    const tipo = cols[0]; // I or E
    const fechaDoc = parseDate(cols[1]);
    const nombre = cols[2].trim();
    const facturaNum = cols[3].trim();
    const remision = cols[4].trim();
    const idNum = cols[5].trim();
    
    const usdStr = cols[6];
    const mxnStr = cols[7];
    
    let amountUSD = parseAmount(usdStr);
    let amountMXN = parseAmount(mxnStr);
    
    // Si la tasa de cambio es 17.3
    const TASA_CAMBIO = 17.3;
    let montoTotalMxn = amountMXN;
    if (montoTotalMxn === 0 && amountUSD !== 0) {
      montoTotalMxn = amountUSD * TASA_CAMBIO;
    } else if (montoTotalMxn !== 0 && amountUSD === 0) {
      amountUSD = montoTotalMxn / TASA_CAMBIO;
    }

    // Fallback: Si las columnas de CANTIDAD (USD y MXN) están vacías,
    // intentamos rescatar el monto de la columna de "PAGO 1 MONTO" (col 10)
    if (montoTotalMxn === 0) {
      const fallbackMonto = parseAmount(cols[10]);
      if (fallbackMonto > 0) {
        montoTotalMxn = fallbackMonto;
      }
    }

    if (montoTotalMxn === 0) {
      console.log(`Saltando fila sin monto: ${line}`);
      continue; // Skip empty rows
    }

    const baseFolio = facturaNum || remision || idNum || `FOLIO-${Date.now()}`;
    const folioFactura = `${baseFolio}-${insertCount}`.substring(0, 50);

    const normName = normalizeName(nombre);

    if (tipo === 'I') {
      // INGRESO -> Cliente & Factura
      let cliente = allClientes.find(c => normalizeName(c.nombre) === normName);
      if (!cliente) {
        console.log(`Creando cliente nuevo: ${nombre}`);
        cliente = await prisma.cliente.create({
          data: { nombre, fuente: 'Importación Histórica' }
        });
        allClientes.push(cliente); // cache
      }

      // Create Factura
      const factura = await prisma.factura.create({
        data: {
          folio: folioFactura.substring(0, 50),
          fecha_emision: fechaDoc || new Date(),
          monto_total: montoTotalMxn,
          descripcion: `Importado de CSV - Remisión: ${remision}, ID: ${idNum}`,
          estatus: FacturaStatus.PENDIENTE, 
          cliente_id: cliente.id,
        }
      });

      // CREAR EL PAGO PARCIAL Y MOVIMIENTO (Un solo pago por el total)
      // Se solicitó ignorar los pagos 1, 2 y 3 y tomar exclusivamente CANTIDAD USD/MXN como el movimiento.
      const montoTotalMxnUnico = montoTotalMxn;
      const montoUsdUnico = amountUSD > 0 ? amountUSD : null;
      const fechaPago = fechaDoc || new Date();

      const descPago = `Cobro de Factura/CxC: ${folioFactura} - Importado de CSV`;

      const mov = await prisma.movimientoFinanciero.create({
        data: {
          fecha: fechaPago,
          descripcion: descPago,
          monto: montoTotalMxnUnico,
          monto_usd: montoUsdUnico,
          sentido: SentidoMovimiento.INGRESO,
          tipo_flujo: TipoFlujo.OPERATIVO,
          origen: 'Cuenta Principal',
          categoria_ingreso: 'Histórico',
        }
      });

      await prisma.pagoParcial.create({
        data: {
          monto: montoTotalMxnUnico,
          fecha: fechaPago,
          metodo_pago: 'Transferencia',
          referencia: 'Histórico CSV',
          factura_id: factura.id,
          movimiento_id: mov.id
        }
      });

      await prisma.factura.update({
        where: { id: factura.id },
        data: { 
          monto_pagado: montoTotalMxnUnico,
          estatus: FacturaStatus.PAGADA
        }
      });

      insertCount++;

    } else if (tipo === 'E') {
      // EGRESO -> Proveedor & CuentaPorPagar
      let proveedor = allProveedores.find(p => normalizeName(p.nombre) === normName);
      if (!proveedor) {
        console.log(`Creando proveedor nuevo: ${nombre}`);
        proveedor = await prisma.proveedor.create({
          data: { nombre }
        });
        allProveedores.push(proveedor); // cache
      }

      const cuentaPagar = await prisma.cuentaPorPagar.create({
        data: {
          folio: folioFactura.substring(0, 50),
          fecha_emision: fechaDoc || new Date(),
          monto_total: montoTotalMxn,
          descripcion: `Importado de CSV - Remisión: ${remision}, ID: ${idNum}`,
          estatus: FacturaStatus.PENDIENTE,
          proveedor_id: proveedor.id,
        }
      });

      // CREAR EL PAGO PARCIAL Y MOVIMIENTO (Un solo pago por el total)
      const montoTotalMxnUnico = montoTotalMxn;
      const montoUsdUnico = amountUSD > 0 ? amountUSD : null;
      const fechaPago = fechaDoc || new Date();

      const descPago = `Pago a Proveedor/CxP: ${folioFactura} - Importado de CSV`;

      const mov = await prisma.movimientoFinanciero.create({
        data: {
          fecha: fechaPago,
          descripcion: descPago,
          monto: montoTotalMxnUnico,
          monto_usd: montoUsdUnico,
          sentido: SentidoMovimiento.EGRESO,
          tipo_flujo: TipoFlujo.OPERATIVO,
          origen: 'Cuenta Principal',
          categoria_egreso: 'Histórico',
        }
      });

      await prisma.pagoParcial.create({
        data: {
          monto: montoTotalMxnUnico,
          fecha: fechaPago,
          metodo_pago: 'Transferencia',
          referencia: 'Histórico CSV',
          cuenta_por_pagar_id: cuentaPagar.id,
          movimiento_id: mov.id
        }
      });

      await prisma.cuentaPorPagar.update({
        where: { id: cuentaPagar.id },
        data: { 
          monto_pagado: montoTotalMxnUnico,
          estatus: FacturaStatus.PAGADA
        }
      });

      insertCount++;
    }
  } // Fin del loop de líneas
  } // Fin del loop de archivos

  console.log(`¡Importación completada! Se inyectaron ${insertCount} registros principales (Facturas/Cuentas por Pagar).`);
}

main().catch(e => {
  console.error('Error durante la importación:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
