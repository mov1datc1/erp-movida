import React from 'react';
import { prisma } from '@/lib/prisma';
import { CuentasPorPagarClient } from './CuentasPorPagarClient';

export default async function CuentasPorPagarPage() {
  let cuentas = [];
  let proveedores = [];
  let favoritos = [];
  
  try {
    cuentas = await prisma.cuentaPorPagar.findMany({
      include: { proveedor: true },
      orderBy: { createdAt: 'desc' }
    });
    
    proveedores = await prisma.proveedor.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: 'asc' }
    });

    favoritos = await prisma.transaccionFrecuente.findMany({
      where: { tipo: 'CXP' },
      include: { proveedor: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    console.error("Failed to fetch CXP data", e);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CuentasPorPagarClient cuentas={cuentas} proveedores={proveedores} favoritos={favoritos} />
    </div>
  );
}
