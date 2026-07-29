import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const projects = await prisma.proyecto.findMany({
    select: { id: true, nombre: true, codigo: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log('Current projects:');
  projects.forEach(p => console.log('  ', p.codigo || '(null)', '-', p.nombre));
  
  const sinCodigo = projects.filter(p => !p.codigo || !p.codigo.startsWith('PROJ-M'));
  
  if (sinCodigo.length === 0) {
    console.log('\\nAll projects already have PROJ-M codes!');
    await prisma.$disconnect();
    return;
  }
  
  let nextNum = 501;
  const withCodigo = projects.filter(p => p.codigo && p.codigo.startsWith('PROJ-M'));
  if (withCodigo.length > 0) {
    const maxNum = Math.max(...withCodigo.map(p => parseInt(p.codigo!.replace('PROJ-M', ''), 10)));
    nextNum = maxNum + 1;
  }
  
  for (const p of sinCodigo) {
    const newCode = `PROJ-M${nextNum}`;
    await prisma.proyecto.update({
      where: { id: p.id },
      data: { codigo: newCode }
    });
    console.log('Assigned', newCode, 'to', p.nombre);
    nextNum++;
  }
  
  console.log(`\\nDone! Assigned ${sinCodigo.length} legacy codes.`);
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
