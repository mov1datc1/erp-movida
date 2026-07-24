import { prisma } from "@/lib/prisma";
import ContableClient from "./ContableClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function ContablePage() {
  const dbMovimientos = await prisma.movimientoFinanciero.findMany({
    include: { 
      linea_producto: true,
      producto_servicio: true,
      proyecto: true 
    },
    orderBy: { fecha: 'desc' }
  });

  const facturasPendientes = await prisma.factura.findMany({
    where: { estatus: 'PENDIENTE' }
  });

  // Calculate first day of the current month
  const primerDiaMes = new Date();
  primerDiaMes.setDate(1);
  primerDiaMes.setHours(0, 0, 0, 0);

  const oportunidadesMes = await prisma.oportunidad.findMany({
    where: {
      updatedAt: { gte: primerDiaMes }
    }
  });

  const movimientos = dbMovimientos.map(m => ({
    id: m.id,
    fecha: format(m.fecha, "dd MMM yyyy", { locale: es }),
    rawFecha: m.fecha.toISOString().split('T')[0],
    descripcion: m.descripcion,
    monto: m.monto,
    monto_usd: m.monto_usd,
    origen: m.origen,
    tipo: (m.sentido === 'INGRESO' ? 'Ingreso' : 'Egreso') as 'Ingreso' | 'Egreso',
    categoria: (m.sentido === 'INGRESO' ? m.categoria_ingreso : m.categoria_egreso) || '',
    es_fiscal: m.es_fiscal,
    linea_producto_id: m.linea_producto_id,
    producto_servicio_id: m.producto_servicio_id,
    proyecto_id: m.proyecto_id,
    proyecto_nombre: m.proyecto?.nombre,
    producto_servicio_nombre: m.producto_servicio?.nombre,
    linea_producto_nombre: m.linea_producto?.nombre
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

  const lineasProducto = await prisma.lineaProducto.findMany({
    where: { activa: true },
    include: { productos: true }
  });

  const proyectos = await prisma.proyecto.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, nombre: true, codigo: true }
  });

  return (
    <ContableClient  
      movimientos={movimientos} 
      ingresosMes={ingresosMes} 
      egresosMes={egresosMes} 
      balanceTotal={balanceTotal}
      rawMovimientos={dbMovimientos}
      facturasPendientes={facturasPendientes}
      oportunidadesMes={oportunidadesMes}
      lineasProducto={lineasProducto}
      proyectos={proyectos}
    />
  );
}
