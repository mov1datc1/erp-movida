'use client';

import React, { useState } from 'react';
import TabRoles from './components/TabRoles';
import TabUsuarios from './components/TabUsuarios';
import TabIntegraciones from './components/TabIntegraciones';
import TabCorreos from './components/TabCorreos';
import type { EmailAccountView } from '@/types/emailAccounts';
import TabOpenAI from './components/TabOpenAI';
import type { OpenAIConfigView } from '@/types/openAIConfig';
import TabJiraLexLatin from './components/TabJiraLexLatin';
import type { JiraLexLatinConfigView } from '@/types/jiraLexLatin';

interface ConfiguracionClientProps {
  initialRoles: any[];
  initialUsuarios: any[];
  initialIntegraciones: any[];
  initialEmailAccounts: EmailAccountView[];
  initialOpenAIConfig: OpenAIConfigView | null;
  initialJiraLexLatinConfig: JiraLexLatinConfigView | null;
}

export default function ConfiguracionClient({ initialRoles, initialUsuarios, initialIntegraciones, initialEmailAccounts, initialOpenAIConfig, initialJiraLexLatinConfig }: ConfiguracionClientProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'usuarios' | 'correos' | 'openai' | 'jira' | 'integraciones'>('roles');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Configuración del Sistema</h1>
        <p className="text-text-muted mt-1">Gestiona roles, usuarios e integraciones externas.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200">
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
          onClick={() => setActiveTab('correos')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'correos' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Cuentas de correo
        </button>
        <button
          onClick={() => setActiveTab('openai')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'openai' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          OpenAI
        </button>
        <button
          onClick={() => setActiveTab('jira')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'jira' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Jira / LexLatin
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
        {activeTab === 'correos' && <TabCorreos initialAccounts={initialEmailAccounts} />}
        {activeTab === 'openai' && <TabOpenAI initialConfig={initialOpenAIConfig} />}
        {activeTab === 'jira' && <TabJiraLexLatin initialConfig={initialJiraLexLatinConfig} />}
        {activeTab === 'integraciones' && <TabIntegraciones initialIntegraciones={initialIntegraciones} />}
      </div>
    </div>
  );
}
