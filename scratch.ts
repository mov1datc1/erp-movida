import { prisma } from './src/lib/prisma'

async function main() {
  const facturas = await prisma.factura.findMany({ where: { es_usa: true, numero_usa: 1558 } })
  for (const f of facturas) {
    await prisma.factura.update({
      where: { id: f.id },
      data: { numero_usa: 1573, folio: 'USA-1573' }
    })
    console.log(`Updated invoice ${f.id} to 1573`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
