import { prisma } from '../src/lib/prisma';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    select: {
      descripcion: true,
      categoria_ingreso: true,
      categoria_egreso: true,
      monto: true
    },
    orderBy: { fecha: 'asc' }
  });
  
  for (const m of movs) {
    if (m.categoria_ingreso !== 'Histórico' || m.categoria_egreso !== 'Histórico') {
        console.log(`[${m.categoria_ingreso || m.categoria_egreso}] ${m.monto} -> ${m.descripcion}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
