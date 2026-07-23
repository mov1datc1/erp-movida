import { SentidoMovimiento, TipoFlujo, FacturaStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';

function parseDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + dateVal * 86400000);
  }
  
  if (typeof dateVal === 'string') {
    const parts = dateVal.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  return null;
}

function parseAmount(amountVal: any): number {
  if (amountVal == null || amountVal === '') return 0;
  if (typeof amountVal === 'number') return amountVal;
  
  const amountStr = String(amountVal);
  let clean = amountStr.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '');
  clean = clean.replace(/,/g, '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function normalizeName(name: string): string {
  if (!name) return '';
  return String(name).trim().toLowerCase();
}

async function main() {
  console.log('Iniciando importación ETL desde Excel...');

  console.log('Limpiando importaciones previas...');
  
  // Delete dependent records first
  await prisma.pagoParcial.deleteMany({ where: { referencia: { contains: 'Histórico' } } }).catch((e) => console.log('Aviso (PagoParcial):', e.message));
  
  await prisma.movimientoFinanciero.deleteMany({ where: { descripcion: { contains: 'Importado' } } }).catch((e) => console.log('Aviso (Movimiento):', e.message));
  await prisma.factura.deleteMany({ where: { descripcion: { contains: 'Importado' } } }).catch((e) => console.log('Aviso (Factura):', e.message));
  await prisma.cuentaPorPagar.deleteMany({ where: { descripcion: { contains: 'Importado' } } }).catch((e) => console.log('Aviso (CxP):', e.message));

  const excelFilePath = path.resolve(process.cwd(), '../RELACION DE GASTOS MES A MES - MOVIDA TCI.xlsx');
  const workbook = xlsx.readFile(excelFilePath);
  
  const allClientes = await prisma.cliente.findMany();
  const allProveedores = await prisma.proveedor.findMany();

  const categoryMapIngreso = new Map<string, string>();
  const categoryMapEgreso = new Map<string, string>();
  
  // Learn mappings from real manual db entries
  const allMovs = await prisma.movimientoFinanciero.findMany();
  for (const mov of allMovs) {
    if (!mov.descripcion.includes('Importado')) {
      const parts = mov.descripcion.split(' - ');
      if (parts.length >= 3) {
        const extractedName = normalizeName(parts[parts.length - 2]);
        if (mov.sentido === 'INGRESO' && mov.categoria_ingreso && mov.categoria_ingreso !== 'Histórico') {
          categoryMapIngreso.set(extractedName, mov.categoria_ingreso);
        }
        if (mov.sentido === 'EGRESO' && mov.categoria_egreso && mov.categoria_egreso !== 'Histórico') {
          categoryMapEgreso.set(extractedName, mov.categoria_egreso);
        }
      }
    }
  }

  categoryMapEgreso.set('deproinf', 'Desarrollo Frontend');
  categoryMapEgreso.set('adonis', 'Desarrollo Backend');
  categoryMapEgreso.set('cube', 'Desarrollo Mobile');
  categoryMapEgreso.set('gat', 'Staffing Ti');
  categoryMapEgreso.set('edgar', 'Staffing Ti');
  categoryMapEgreso.set('dasha', 'Marketing y Pauta (CAC)');

  let insertCount = 0;

  for (const sheetName of workbook.SheetNames) {
    if (!/^\d{2}-\d{2}$/.test(sheetName)) {
      console.log(`Saltando hoja: ${sheetName}`);
      continue;
    }

    console.log(`Procesando hoja: ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (rows[i] && typeof rows[i][0] === 'string' && rows[i][0].includes('INGRESO')) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.log(`No se encontró la cabecera en ${sheetName}`);
      continue;
    }

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      let tipoRaw = row[0];
      if (typeof tipoRaw === 'string') tipoRaw = tipoRaw.trim().toUpperCase();
      
      if (tipoRaw !== 'I' && tipoRaw !== 'E') continue;

      const tipo = tipoRaw;
      const fechaDoc = parseDate(row[1]) || new Date(2000 + parseInt(sheetName.split('-')[1]), parseInt(sheetName.split('-')[0]) - 1, 15);
      const nombre = String(row[2] || '').trim();
      if (!nombre) continue;

      const facturaNum = String(row[3] || '').trim();
      const remision = String(row[4] || '').trim();
      const idNum = String(row[5] || '').trim();
      
      let amountUSD = parseAmount(row[6]);
      let amountMXN = parseAmount(row[7]);
      
      const TASA_CAMBIO = 17.3;
      let montoTotalMxn = amountMXN;
      if (montoTotalMxn === 0 && amountUSD !== 0) {
        montoTotalMxn = amountUSD * TASA_CAMBIO;
      } else if (montoTotalMxn !== 0 && amountUSD === 0) {
        amountUSD = montoTotalMxn / TASA_CAMBIO;
      }

      if (montoTotalMxn === 0) {
        const fallback = parseAmount(row[8]) || parseAmount(row[9]) || parseAmount(row[10]);
        if (fallback > 0) montoTotalMxn = fallback;
      }

      if (montoTotalMxn === 0) continue;

      const baseFolio = facturaNum || remision || idNum || `FOL-${sheetName}`;
      const folioFactura = `${baseFolio}-${insertCount}`.substring(0, 50);
      const normName = normalizeName(nombre);

      if (tipo === 'I') {
        let cliente = allClientes.find(c => normalizeName(c.nombre) === normName);
        if (!cliente) {
          cliente = await prisma.cliente.create({ data: { nombre, fuente: 'Importación Excel' } });
          allClientes.push(cliente);
        }

        const factura = await prisma.factura.create({
          data: {
            folio: folioFactura,
            fecha_emision: fechaDoc,
            monto_total: montoTotalMxn,
            descripcion: `Importado de Excel (${sheetName}) - Remisión: ${remision}`,
            estatus: FacturaStatus.PAGADA, 
            monto_pagado: montoTotalMxn,
            cliente_id: cliente.id,
          }
        });

        const mov = await prisma.movimientoFinanciero.create({
          data: {
            fecha: fechaDoc,
            descripcion: `Cobro de Factura/CxC: ${folioFactura} - ${nombre} - Importado de Excel`,
            monto: montoTotalMxn,
            monto_usd: amountUSD > 0 ? amountUSD : null,
            sentido: SentidoMovimiento.INGRESO,
            tipo_flujo: TipoFlujo.OPERATIVO,
            origen: 'Cuenta Principal',
            categoria_ingreso: categoryMapIngreso.get(normName) || 'Histórico',
          }
        });

        await prisma.pagoParcial.create({
          data: {
            monto: montoTotalMxn,
            fecha: fechaDoc,
            metodo_pago: 'Transferencia',
            referencia: 'Histórico Excel',
            factura_id: factura.id,
            movimiento_id: mov.id
          }
        });
        insertCount++;

      } else if (tipo === 'E') {
        let proveedor = allProveedores.find(p => normalizeName(p.nombre) === normName);
        if (!proveedor) {
          proveedor = await prisma.proveedor.create({ data: { nombre } });
          allProveedores.push(proveedor);
        }

        const cuentaPagar = await prisma.cuentaPorPagar.create({
          data: {
            folio: folioFactura,
            fecha_emision: fechaDoc,
            monto_total: montoTotalMxn,
            descripcion: `Importado de Excel (${sheetName}) - Remisión: ${remision}`,
            estatus: FacturaStatus.PAGADA,
            monto_pagado: montoTotalMxn,
            proveedor_id: proveedor.id,
          }
        });

        const mov = await prisma.movimientoFinanciero.create({
          data: {
            fecha: fechaDoc,
            descripcion: `Pago a Proveedor/CxP: ${folioFactura} - ${nombre} - Importado de Excel`,
            monto: montoTotalMxn,
            monto_usd: amountUSD > 0 ? amountUSD : null,
            sentido: SentidoMovimiento.EGRESO,
            tipo_flujo: TipoFlujo.OPERATIVO,
            origen: 'Cuenta Principal',
            categoria_egreso: categoryMapEgreso.get(normName) || 'Histórico',
          }
        });

        await prisma.pagoParcial.create({
          data: {
            monto: montoTotalMxn,
            fecha: fechaDoc,
            metodo_pago: 'Transferencia',
            referencia: 'Histórico Excel',
            cuenta_por_pagar_id: cuentaPagar.id,
            movimiento_id: mov.id
          }
        });
        insertCount++;
      }
    }
  }

  console.log(`¡Importación completada! Se inyectaron ${insertCount} registros.`);
}

main().catch(e => {
  console.error('Error durante la importación:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
