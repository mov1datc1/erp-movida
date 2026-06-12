'use client';

import React, { useState } from 'react';
import TabRoles from './components/TabRoles';
import TabUsuarios from './components/TabUsuarios';
import TabIntegraciones from './components/TabIntegraciones';

interface ConfiguracionClientProps {
  initialRoles: any[];
  initialUsuarios: any[];
  initialIntegraciones: any[];
}

export default function ConfiguracionClient({ initialRoles, initialUsuarios, initialIntegraciones }: ConfiguracionClientProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'usuarios' | 'integraciones'>('roles');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Configuración del Sistema</h1>
        <p className="text-text-muted mt-1">Gestiona roles, usuarios e integraciones externas.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Control de Roles
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'usuarios' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Control de Usuarios
        </button>
        <button
          onClick={() => setActiveTab('integraciones')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'integraciones' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Integraciones
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'roles' && <TabRoles initialRoles={initialRoles} />}
        {activeTab === 'usuarios' && <TabUsuarios initialUsuarios={initialUsuarios} roles={initialRoles} />}
        {activeTab === 'integraciones' && <TabIntegraciones initialIntegraciones={initialIntegraciones} />}
      </div>
    </div>
  );
}
