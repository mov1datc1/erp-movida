'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, Bot, CheckCircle2, ExternalLink, KeyRound, Loader2, Save, ShieldCheck, TestTube2 } from 'lucide-react';
import { saveOpenAIConfiguration, testOpenAIConfiguration } from '../actions';
import type { OpenAIConfigInput, OpenAIConfigView } from '@/types/openAIConfig';

const defaultConfig: OpenAIConfigView = {
  activa: false,
  apiKeyConfigurada: false,
  organizationId: '',
  projectId: '',
  modeloRapido: 'gpt-6-luna',
  modeloEquilibrado: 'gpt-6.1-sol',
  modeloComplejo: 'gpt-6-astra',
  limiteMensualUsd: 100,
  limitePorEjecucionUsd: 2,
};

const modelOptions = [
  { value: 'gpt-6-luna', label: 'GPT-6 Luna — volumen y tareas repetitivas' },
  { value: 'gpt-6.1-sol', label: 'GPT-6.1 Sol — equilibrio y orquestación' },
  { value: 'gpt-6-astra', label: 'GPT-6 Astra — casos complejos' },
];

export default function TabOpenAI({ initialConfig }: { initialConfig: OpenAIConfigView | null }) {
  const config = initialConfig || defaultConfig;
  const [form, setForm] = useState<OpenAIConfigInput>({
    activa: config.activa,
    apiKey: '',
    organizationId: config.organizationId,
    projectId: config.projectId,
    modeloRapido: config.modeloRapido,
    modeloEquilibrado: config.modeloEquilibrado,
    modeloComplejo: config.modeloComplejo,
    limiteMensualUsd: config.limiteMensualUsd,
    limitePorEjecucionUsd: config.limitePorEjecucionUsd,
    fechaRotacion: config.fechaRotacion,
  });
  const [savedConfig, setSavedConfig] = useState(config);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const update = <K extends keyof OpenAIConfigInput>(key: K, value: OpenAIConfigInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const result = await saveOpenAIConfiguration(form);
    setSaving(false);

    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible guardar la configuración.' });
      return;
    }

    setSavedConfig(result.data);
    setForm((current) => ({ ...current, apiKey: '' }));
    setFeedback({ success: true, message: 'Configuración de OpenAI guardada de forma segura.' });
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    const result = await testOpenAIConfiguration();
    setTesting(false);
    setFeedback({
      success: Boolean(result.success),
      message: result.success ? result.message || 'Conexión exitosa.' : result.error || 'La prueba falló.',
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Bot className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">OpenAI API</h2>
              <p className="mt-1 text-sm text-slate-500">Credencial y modelos que utilizarán los agentes de Movida.</p>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Integración activa
            <input type="checkbox" checked={form.activa} onChange={(event) => update('activa', event.target.checked)} className="h-4 w-4 accent-emerald-600" />
          </label>
        </div>

        {feedback && (
          <div className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {feedback.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {feedback.message}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-500" /><h3 className="font-bold text-slate-800">Credencial del proyecto</h3></div>
          <Field label={savedConfig.apiKeyConfigurada ? `API key configurada ••••${savedConfig.apiKeyUltimos4 || ''}` : 'API key de OpenAI'} hint={savedConfig.apiKeyConfigurada ? 'Déjala vacía para conservar la llave actual.' : 'Utiliza una llave de proyecto o cuenta de servicio, no una llave personal compartida.'}>
            <input type="password" value={form.apiKey || ''} onChange={(event) => update('apiKey', event.target.value)} required={!savedConfig.apiKeyConfigurada} autoComplete="new-password" placeholder="sk-..." className="input-openai font-mono" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project ID (opcional)" hint="Ejemplo: proj_...">
              <input value={form.projectId} onChange={(event) => update('projectId', event.target.value)} placeholder="proj_..." className="input-openai font-mono" />
            </Field>
            <Field label="Organization ID (opcional)" hint="Ejemplo: org-...">
              <input value={form.organizationId} onChange={(event) => update('organizationId', event.target.value)} placeholder="org-..." className="input-openai font-mono" />
            </Field>
          </div>
          <Field label="Próxima rotación de la llave (opcional)" hint="El ERP podrá generar un recordatorio antes de esta fecha.">
            <input type="date" value={form.fechaRotacion || ''} onChange={(event) => update('fechaRotacion', event.target.value)} className="input-openai md:max-w-xs" />
          </Field>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <div><h3 className="font-bold text-slate-800">Perfiles de modelo</h3><p className="mt-1 text-xs text-slate-500">Cada agente elegirá el perfil según dificultad y costo, no un modelo único para todo.</p></div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ModelField label="Rápido / volumen" value={form.modeloRapido} onChange={(value) => update('modeloRapido', value)} />
            <ModelField label="Equilibrado" value={form.modeloEquilibrado} onChange={(value) => update('modeloEquilibrado', value)} />
            <ModelField label="Complejo" value={form.modeloComplejo} onChange={(value) => update('modeloComplejo', value)} />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <div><h3 className="font-bold text-slate-800">Límites internos</h3><p className="mt-1 text-xs text-slate-500">Quedan preparados para aplicarse cuando activemos el runtime de agentes; también debes configurar alertas y topes en OpenAI Platform.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Presupuesto mensual (USD)"><input type="number" min={0} step="0.01" value={form.limiteMensualUsd} onChange={(event) => update('limiteMensualUsd', Number(event.target.value))} className="input-openai" /></Field>
            <Field label="Máximo estimado por ejecución (USD)"><input type="number" min={0} step="0.01" value={form.limitePorEjecucionUsd} onChange={(event) => update('limitePorEjecucionUsd', Number(event.target.value))} className="input-openai" /></Field>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={handleTest} disabled={testing || !savedConfig.apiKeyConfigurada || !savedConfig.activa} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Probar Responses API
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuración
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800"><ShieldCheck className="h-5 w-5" /><h3 className="font-bold">Seguridad</h3></div>
          <ul className="mt-3 space-y-2 text-sm text-emerald-900/80">
            <li>La API key se cifra antes de guardarse.</li>
            <li>Nunca se devuelve al navegador.</li>
            <li>Solo Configuración puede reemplazarla.</li>
            <li>Las pruebas usan el servidor del ERP.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-800">Recomendación</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Crea un proyecto exclusivo para Movida ERP y una cuenta de servicio con los permisos mínimos necesarios.</p>
          <a href="https://platform.openai.com/settings/organization/api-keys" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">Abrir OpenAI Platform <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </aside>

      <style jsx global>{`
        .input-openai { width: 100%; border: 1px solid rgb(226 232 240); border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; background: white; }
        .input-openai:focus { border-color: rgb(5 150 105); box-shadow: 0 0 0 3px rgb(5 150 105 / 0.12); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>;
}

function ModelField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input-openai">
        {modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}
