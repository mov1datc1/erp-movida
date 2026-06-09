import { prisma } from './src/lib/prisma';

async function test() {
  try {
    const res = await prisma.cotizacion.findMany({ include: { cliente: true } });
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("PRISMA ERROR DETAILS:");
    console.error(e);
  }
}

test();
