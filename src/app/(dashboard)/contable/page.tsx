import { prisma } from "@/lib/prisma";
import ContableClient from "./ContableClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function ContablePage() {
  const dbMovimientos = await prisma.movimientoFinanciero.findMany({
    orderBy: { fecha: 'desc' }
  });

  const movimientos = dbMovimientos.map(m => ({
    id: m.id,
    fecha: format(m.fecha, "dd MMM yyyy", { locale: es }),
    descripcion: m.descripcion,
    monto: m.monto,
    tipo: m.sentido === 'INGRESO' ? 'Ingreso' : 'Egreso' as const,
    categoria: (m.sentido === 'INGRESO' ? m.categoria_ingreso : m.categoria_egreso) || ''
  }));

  const ingresosMes = dbMovimientos
    .filter(m => m.sentido === 'INGRESO' && new Date(m.fecha).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.monto, 0);

  const egresosMes = dbMovimientos
    .filter(m => m.sentido === 'EGRESO' && new Date(m.fecha).getMonth() === new Date().getMonth())
    .reduce((acc, curr) => acc + curr.monto, 0);

  const balanceTotal = dbMovimientos.reduce((acc, curr) => {
    return curr.sentido === 'INGRESO' ? acc + curr.monto : acc - curr.monto;
  }, 0);

  return (
    <ContableClient 
      movimientos={movimientos} 
      ingresosMes={ingresosMes} 
      egresosMes={egresosMes} 
      balanceTotal={balanceTotal} 
    />
  );
}
