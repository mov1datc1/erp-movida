'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, KeyRound, Loader2, Save, ShieldCheck, TestTube2, Workflow } from 'lucide-react';
import { saveJiraLexLatinConfiguration, testJiraLexLatinConfiguration } from '../actions';
import type { JiraFieldOption, JiraLexLatinConfigInput, JiraLexLatinConfigView } from '@/types/jiraLexLatin';

const defaultConfig: JiraLexLatinConfigView = {
  activa: false,
  tokenConfigured: false,
  siteUrl: 'https://lexlatin.atlassian.net',
  accountEmail: 'soporte@movidatci.mx',
  projectKey: 'MDS',
  timeWorkedFieldId: '',
  targetDateFieldId: '',
  approverOperationsEmail: 'edgar.jaen@movidatci.com',
  approverDeliveryEmail: 'jonathan@movidatci.com',
  recipientTo: 'edith.santos@lexlatin.com',
  recipientCc: 'ricardo@movidatci.com, jonathan@movidatci.com',
  cutoffStartDay: 1,
  cutoffEndDay: 5,
};

export default function TabJiraLexLatin({ initialConfig }: { initialConfig: JiraLexLatinConfigView | null }) {
  const config = initialConfig || defaultConfig;
  const [savedConfig, setSavedConfig] = useState(config);
  const [form, setForm] = useState<JiraLexLatinConfigInput>({
    ...config,
    apiToken: '',
  });
  const [fields, setFields] = useState<JiraFieldOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const update = <K extends keyof JiraLexLatinConfigInput>(key: K, value: JiraLexLatinConfigInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const result = await saveJiraLexLatinConfiguration(form);
    setSaving(false);
    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible guardar la integración.' });
      return;
    }
    setSavedConfig(result.data);
    setForm((current) => ({ ...current, apiToken: '' }));
    setFeedback({ success: true, message: 'Configuración de Jira guardada de forma segura.' });
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    const result = await testJiraLexLatinConfiguration();
    setTesting(false);
    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'La prueba de Jira falló.' });
      return;
    }
    setFields(result.data.fields);
    if (!form.timeWorkedFieldId && result.data.suggestedTimeField) update('timeWorkedFieldId', result.data.suggestedTimeField.id);
    if (!form.targetDateFieldId && result.data.suggestedTargetField) update('targetDateFieldId', result.data.suggestedTargetField.id);
    setFeedback({
      success: true,
      message: `Conexión exitosa como ${result.data.user}. Proyecto ${result.data.project.key}: ${result.data.project.name}.`,
    });
  };

  const customFields = fields.filter((field) => field.id.startsWith('customfield_'));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Workflow className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Jira / LexLatin</h2>
              <p className="mt-1 text-sm text-slate-500">Cuenta técnica, reglas de corte y responsables del reporte mensual.</p>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Integración activa
            <input type="checkbox" checked={form.activa} onChange={(event) => update('activa', event.target.checked)} className="h-4 w-4 accent-blue-600" />
          </label>
        </div>

        {feedback && (
          <div className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {feedback.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {feedback.message}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-500" /><h3 className="font-bold text-slate-800">Acceso a Atlassian</h3></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sitio Jira"><input value={form.siteUrl} onChange={(event) => update('siteUrl', event.target.value)} required className="input-jira" /></Field>
            <Field label="Clave de proyecto" hint="Las capturas y el Excel usan MDS; el enlace compartido también menciona SIT."><input value={form.projectKey} onChange={(event) => update('projectKey', event.target.value.toUpperCase())} required className="input-jira font-mono" /></Field>
            <Field label="Correo de la cuenta técnica"><input type="email" value={form.accountEmail} onChange={(event) => update('accountEmail', event.target.value)} required className="input-jira" /></Field>
            <Field label={savedConfig.tokenConfigured ? `Token configurado ••••${savedConfig.tokenLast4 || ''}` : 'Token API de Atlassian'} hint={savedConfig.tokenConfigured ? 'Déjalo vacío para conservar el token actual.' : 'No uses la contraseña normal de la cuenta.'}>
              <input type="password" value={form.apiToken || ''} onChange={(event) => update('apiToken', event.target.value)} required={!savedConfig.tokenConfigured} autoComplete="new-password" className="input-jira font-mono" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <div><h3 className="font-bold text-slate-800">Mapeo de campos</h3><p className="mt-1 text-xs text-slate-500">Prueba la conexión para detectar automáticamente los campos disponibles.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Campo Tiempo Trabajado" hint="Si queda vacío se utilizará el tiempo registrado en worklogs.">
              {customFields.length ? <select value={form.timeWorkedFieldId} onChange={(event) => update('timeWorkedFieldId', event.target.value)} className="input-jira"><option value="">Usar worklogs estándar</option>{customFields.map((field) => <option key={field.id} value={field.id}>{field.name} — {field.id}</option>)}</select> : <input value={form.timeWorkedFieldId} onChange={(event) => update('timeWorkedFieldId', event.target.value)} placeholder="customfield_12345" className="input-jira font-mono" />}
            </Field>
            <Field label="Campo Fecha estimada de término" hint="Si queda vacío se utilizará Due date y la estimación original.">
              {customFields.length ? <select value={form.targetDateFieldId} onChange={(event) => update('targetDateFieldId', event.target.value)} className="input-jira"><option value="">Usar Due date</option>{customFields.map((field) => <option key={field.id} value={field.id}>{field.name} — {field.id}</option>)}</select> : <input value={form.targetDateFieldId} onChange={(event) => update('targetDateFieldId', event.target.value)} placeholder="customfield_12346" className="input-jira font-mono" />}
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-5">
          <div><h3 className="font-bold text-slate-800">Aprobaciones y entrega</h3><p className="mt-1 text-xs text-slate-500">Edgar aprueba operaciones en Jira; Jonathan aprueba el reporte y el correo final.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Aprobador de cambios en Jira"><input type="email" value={form.approverOperationsEmail} onChange={(event) => update('approverOperationsEmail', event.target.value)} required className="input-jira" /></Field>
            <Field label="Aprobador del envío final"><input type="email" value={form.approverDeliveryEmail} onChange={(event) => update('approverDeliveryEmail', event.target.value)} required className="input-jira" /></Field>
            <Field label="Destinatario principal"><input type="email" value={form.recipientTo} onChange={(event) => update('recipientTo', event.target.value)} required className="input-jira" /></Field>
            <Field label="Copias del correo" hint="Separa las direcciones con coma."><input value={form.recipientCc} onChange={(event) => update('recipientCc', event.target.value)} className="input-jira" /></Field>
          </div>
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <Field label="Inicio de corte"><input type="number" min={1} max={28} value={form.cutoffStartDay} onChange={(event) => update('cutoffStartDay', Number(event.target.value))} className="input-jira" /></Field>
            <Field label="Fin de corte"><input type="number" min={1} max={28} value={form.cutoffEndDay} onChange={(event) => update('cutoffEndDay', Number(event.target.value))} className="input-jira" /></Field>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={handleTest} disabled={testing || !savedConfig.tokenConfigured || !savedConfig.activa} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Probar y detectar campos
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuración
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 text-blue-800"><ShieldCheck className="h-5 w-5" /><h3 className="font-bold">Control operativo</h3></div>
          <ul className="mt-3 space-y-2 text-sm text-blue-900/80">
            <li>El token queda cifrado y nunca vuelve al navegador.</li>
            <li>Sin aprobación de Edgar no se modifica Jira.</li>
            <li>Sin aprobación de Jonathan no se envía al cliente.</li>
            <li>Los cálculos del reporte no dependen de la IA.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h3 className="font-bold">Credencial necesaria</h3>
          <p className="mt-2 leading-6">Atlassian ya no permite usar la contraseña normal en su API. Genera un token para <strong>soporte@movidatci.mx</strong> y colócalo aquí.</p>
          <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-bold text-amber-800 hover:underline">Crear token API <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </aside>

      <style jsx global>{`
        .input-jira { width: 100%; border: 1px solid rgb(226 232 240); border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; background: white; }
        .input-jira:focus { border-color: rgb(37 99 235); box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs leading-5 text-slate-400">{hint}</span>}</label>;
}
