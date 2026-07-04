import { getRecordatorios, getTareasParaDropdown } from "@/app/actions/recordatorios";
import RecordatoriosClient from "./RecordatoriosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recordatorios | ERP Movida",
  description: "Gestión de recordatorios y automatizaciones",
};

export default async function RecordatoriosPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string };
}) {
  const start = searchParams?.start ? new Date(searchParams.start) : undefined;
  const end = searchParams?.end ? new Date(searchParams.end) : undefined;

  const recordatorios = await getRecordatorios(start, end);
  const tareasDropdown = await getTareasParaDropdown();

  return (
    <div className="w-full h-full p-4 md:p-6 lg:p-8 animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            Recordatorios
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Administra notificaciones automáticas y asocialas a tareas pendientes.
          </p>
        </div>
      </div>

      <RecordatoriosClient 
        initialRecordatorios={recordatorios} 
        tareasDisponibles={tareasDropdown} 
      />
    </div>
  );
}
