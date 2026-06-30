import React from "react";
import { notFound } from "next/navigation";
import { getClienteCompleto } from "@/app/actions/crm";
import ClienteDetailClient from "./ClienteDetailClient";

export const dynamic = 'force-dynamic';

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const result = await getClienteCompleto(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ClienteDetailClient cliente={result.data} />
    </div>
  );
}
