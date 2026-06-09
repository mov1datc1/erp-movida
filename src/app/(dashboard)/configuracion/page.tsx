import React from "react";
import { Settings } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl card-shadow border border-white/50 text-center max-w-md w-full">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/20">
          <Settings className="w-8 h-8 animate-[spin_4s_linear_infinite]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Configuración</h1>
        <p className="text-slate-500 mb-6">
          Este módulo está actualmente en desarrollo. Pronto podrás gestionar los ajustes generales del ERP desde aquí.
        </p>
        <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200">
          Próximamente
        </div>
      </div>
    </div>
  );
}
