import React from "react";
import { prisma } from "@/lib/prisma";
import { FacturacionClient } from "./FacturacionClient";

export const dynamic = 'force-dynamic';

export default async function FacturacionPage() {
  let facturas: any[] = [];
  try {
    facturas = await prisma.factura.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (e) {
    console.error("Failed to fetch facturas", e);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FacturacionClient facturas={facturas} />
    </div>
  );
}
