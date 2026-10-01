'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Plus, Save, Send, Server, ShieldCheck, X } from 'lucide-react';
import { saveEmailAccount, testEmailAccount } from '../actions';
import type { EmailAccountInput, EmailAccountPurpose, EmailAccountView } from '@/types/emailAccounts';

const purposeLabels: Record<EmailAccountPurpose, string> = {
  FACTURACION: 'Facturación',
  CONCILIACION: 'Conciliación',
  NOTIFICACIONES: 'Notificaciones',
  AGENTES: 'Agentes operativos',
  GENERAL: 'Uso general',
};

const emptyForm: EmailAccountInput = {
  id: '',
  nombre: '',
  proposito: 'GENERAL',
  nombreRemitente: 'Movida TCI',
  email: '',
  usuario: '',
  password: '',
  smtpHost: '',
  smtpPort: 465,
  smtpSeguro: true,
  imapHost: '',
  imapPort: 993,
  imapSeguro: true,
  activa: true,
};

export default function TabCorreos({ initialAccounts }: { initialAccounts: EmailAccountView[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [form, setForm] = useState<EmailAccountInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const openNew = () => {
    setForm(emptyForm);
    setFeedback(null);
    setOpen(true);
  };

  const openEdit = (account: EmailAccountView) => {
    setForm({
      ...account,
      password: '',
    });
    setFeedback(null);
    setOpen(true);
  };

  const update = <K extends keyof EmailAccountInput>(key: K, value: EmailAccountInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const result = await saveEmailAccount(form);
    setSaving(false);

    if (!result.success || !result.data) {
      setFeedback({ success: false, message: result.error || 'No fue posible guardar la cuenta.' });
      return;
    }

    setAccounts(result.data);
    setOpen(false);
  };

  const handleTest = async (account: EmailAccountView) => {
    setTestingId(account.id);
    setFeedback(null);
    const result = await testEmailAccount(account.id);
    setTestingId(null);
    setFeedback({
      success: Boolean(result.success),
      message: result.success ? result.message || 'Conexión exitosa.' : result.error || 'La prueba falló.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Cuentas de correo del ERP</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Configura las cuentas que usarán facturación, conciliación, notificaciones y posteriormente los agentes. Las contraseñas se cifran y nunca se muestran de nuevo.
          </p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Agregar cuenta
        </button>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${feedback.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Mail className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-bold text-slate-700">Aún no hay cuentas configuradas</h3>
          <p className="mt-1 text-sm text-slate-500">Empieza con facturacion@movidatci.com o conciliacion@movidatci.com.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${account.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {account.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-slate-800">{account.nombre}</h3>
              <p className="mt-0.5 break-all text-sm text-slate-600">{account.email}</p>
              <span className="mt-3 inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                {purposeLabels[account.proposito]}
              </span>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p className="flex items-center gap-2"><Server className="h-3.5 w-3.5" /> SMTP {account.smtpHost}:{account.smtpPort}</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Contraseña {account.tienePassword ? 'configurada' : 'pendiente'}</p>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => openEdit(account)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Editar</button>
                <button onClick={() => handleTest(account)} disabled={testingId === account.id} className="flex-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  {testingId === account.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <span className="inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Probar correo</span>}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Cerrar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{form.id ? 'Editar cuenta' : 'Nueva cuenta de correo'}</h3>
                <p className="mt-1 text-sm text-slate-500">Datos de envío SMTP y recepción IMAP administrados en SiteGround.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {feedback && !feedback.success && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4" />{feedback.message}</div>
              )}

              <section className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre interno">
                  <input value={form.nombre} onChange={(e) => update('nombre', e.target.value)} required placeholder="Facturación Movida" className="input-email" />
                </Field>
                <Field label="Uso de la cuenta">
                  <select value={form.proposito} onChange={(e) => update('proposito', e.target.value as EmailAccountPurpose)} className="input-email">
                    {Object.entries(purposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Nombre del remitente">
                  <input value={form.nombreRemitente} onChange={(e) => update('nombreRemitente', e.target.value)} required placeholder="Facturación Movida TCI" className="input-email" />
                </Field>
                <Field label="Dirección de correo">
                  <input type="email" value={form.email} onChange={(e) => { update('email', e.target.value); if (!form.usuario) update('usuario', e.target.value); }} required placeholder="facturacion@movidatci.com" className="input-email" />
                </Field>
                <Field label="Usuario del servidor">
                  <input value={form.usuario} onChange={(e) => update('usuario', e.target.value)} required placeholder="facturacion@movidatci.com" className="input-email" />
                </Field>
                <Field label={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'} hint={form.id ? 'Déjala vacía para conservar la actual.' : undefined}>
                  <input type="password" value={form.password || ''} onChange={(e) => update('password', e.target.value)} required={!form.id} autoComplete="new-password" placeholder="••••••••••••" className="input-email" />
                </Field>
              </section>

              <section>
                <h4 className="mb-3 font-bold text-slate-800">Servidor de salida (SMTP)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Servidor" hint="En SiteGround usa el hostname exacto de Mail Configuration; evita dominios detrás del proxy de Cloudflare."><input value={form.smtpHost} onChange={(e) => update('smtpHost', e.target.value)} required placeholder="gvam1133.siteground.biz" className="input-email" /></Field>
                  <Field label="Puerto"><input type="number" value={form.smtpPort} onChange={(e) => update('smtpPort', Number(e.target.value))} required min={1} max={65535} className="input-email" /></Field>
                  <Toggle label="Conexión segura" checked={form.smtpSeguro} onChange={(checked) => update('smtpSeguro', checked)} />
                </div>
              </section>

              <section>
                <h4 className="mb-3 font-bold text-slate-800">Servidor de entrada (IMAP)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Servidor"><input value={form.imapHost} onChange={(e) => update('imapHost', e.target.value)} required placeholder="gvam1133.siteground.biz" className="input-email" /></Field>
                  <Field label="Puerto"><input type="number" value={form.imapPort} onChange={(e) => update('imapPort', Number(e.target.value))} required min={1} max={65535} className="input-email" /></Field>
                  <Toggle label="Conexión segura" checked={form.imapSeguro} onChange={(checked) => update('imapSeguro', checked)} />
                </div>
              </section>

              <Toggle label="Cuenta activa" checked={form.activa} onChange={(checked) => update('activa', checked)} />

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-email { width: 100%; border: 1px solid rgb(226 232 240); border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input-email:focus { border-color: rgb(79 70 229); box-shadow: 0 0 0 3px rgb(79 70 229 / 0.12); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
    </label>
  );
}
