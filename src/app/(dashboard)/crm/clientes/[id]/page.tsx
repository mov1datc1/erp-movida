import React from "react";
import { notFound } from "next/navigation";
import { getClienteCompleto } from "@/app/actions/crm";
import ClienteDetailClient from "./ClienteDetailClient";

export const dynamic = 'force-dynamic';

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getClienteCompleto(id);

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center text-red-500">
        <h1 className="text-2xl font-bold mb-2">Error al cargar cliente</h1>
        <p>{result.error || "Cliente no encontrado"}</p>
        <p className="mt-4 font-mono text-sm">{JSON.stringify(result)}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ClienteDetailClient cliente={result.data} />
    </div>
  );
}
