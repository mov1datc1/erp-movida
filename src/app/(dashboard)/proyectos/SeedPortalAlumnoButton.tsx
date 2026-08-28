'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, Rocket } from 'lucide-react';
import { seedPortalAlumnoDemo } from '@/app/actions/sprints';
import { useRouter } from 'next/navigation';

export default function SeedPortalAlumnoButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSeed = async () => {
    setIsLoading(true);
    const res = await seedPortalAlumnoDemo();
    setIsLoading(false);
    if (res.success && res.proyectoId) {
      router.push(`/proyectos/${res.proyectoId}`);
    } else {
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={isLoading}
      className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95"
      title="Cargar / Reiniciar Proyecto Demo: Portal del Alumno Les Rois"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
      ) : (
        <Rocket className="w-4 h-4 text-amber-300" />
      )}
      <span>Ver Demo Portal Alumno</span>
    </button>
  );
}
