import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: "0bcd2d13-32c1-4410-8d9c-e766ba13900b" },
      include: {
        actividades_crm: true,
      }
    });
    console.log("Cliente:", cliente ? "Found" : "Not Found");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
