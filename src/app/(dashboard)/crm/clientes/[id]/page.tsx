import React from "react";
import { notFound } from "next/navigation";
import { getClienteCompleto } from "@/app/actions/crm";
import ClienteDetailClient from "./ClienteDetailClient";

export const dynamic = 'force-dynamic';

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getClienteCompleto(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ClienteDetailClient cliente={result.data} />
    </div>
  );
}
