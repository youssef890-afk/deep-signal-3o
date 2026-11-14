import { useState } from 'react';
import { Check, Clipboard, ExternalLink, FileText, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  APPLICATION_TEXT_LIMIT,
  OFFICIAL_APPLICATION_URL,
  applicationFieldLabels,
  applicationTextFields,
  draftApplicationAnswers,
  formatApplication,
  initialApplication,
  validateApplication,
  type Application,
} from '@/lib/openSourceApplication';

function copyText(value: string): Promise<void> {
  return navigator.clipboard.writeText(value);
}

export default function OpenSourceApplicationAssistantPage() {
  const [application, setApplication] = useState<Application>(initialApplication);
  const [copied, setCopied] = useState<keyof Application | 'all' | null>(null);
  const [copyError, setCopyError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const drafts = draftApplicationAnswers(application);
  const missing = validateApplication(application);

  function update(key: keyof Application, value: string) {
    setApplication((current) => ({ ...current, [key]: value }));
    setCopyError('');
  }

  async function copy(key: keyof Application | 'all') {
    const value = key === 'all' ? formatApplication(application) : application[key];
    try {
      await copyText(value);
      setCopied(key);
      setCopyError('');
      window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800);
    } catch {
      setCopyError('تعذر الوصول إلى الحافظة. انسخ النص يدوياً بعد تحديده.');
    }
  }

  function reset() {
    setApplication(initialApplication);
    setCopied(null);
    setCopyError('');
    setShowPreview(false);
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
  const answer = formatApplication(application);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-10" dir="ltr">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"><FileText size={14} /> Independent preparation assistant</div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Open Source Application Assistant</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">Prepare and review answers for the Codex for Open Source application. This is an independent tool, not an OpenAI product; it does not submit the form or promise acceptance.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs text-emerald-100/80"><LockKeyhole size={15} /> Session-only form data</div>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-200/15 bg-amber-100/[0.04] p-4 sm:p-5" aria-labelledby="license-check-heading">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
          <div className="min-w-0 flex-1">
            <h2 id="license-check-heading" className="text-sm font-semibold text-amber-100">Verify the repository license before claiming eligibility</h2>
            <p className="mt-1 text-xs leading-5 text-white/55">A license file was not found in this local checkout. Choose the accurate status below and confirm the public GitHub repository before you submit.</p>
            <label className="mt-3 block text-xs font-medium text-white/75" htmlFor="license-status">Repository license status</label>
            <select id="license-status" value={application.licenseStatus} onChange={(event) => update('licenseStatus', event.target.value)} className={inputClass}>
              <option value="">Choose after verifying</option>
              <option>Has a public open-source license</option>
              <option>No public license found</option>
              <option>Not sure yet</option>
            </select>
          </div>
        </div>
      </section>

      <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); setShowPreview(true); }}>
        <section className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-white">Application profile</h2>
          <p className="mt-1 text-xs text-white/45">Private details stay in this page's memory and clear when you leave or reset.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={applicationFieldLabels.firstName} required value={application.firstName} onChange={(value) => update('firstName', value)} inputClass={inputClass} />
            <Field label={applicationFieldLabels.lastName} required value={application.lastName} onChange={(value) => update('lastName', value)} inputClass={inputClass} />
            <Field label={applicationFieldLabels.email} required type="email" value={application.email} onChange={(value) => update('email', value)} inputClass={inputClass} autoComplete="email" />
            <Field label={applicationFieldLabels.githubUsername} required value={application.githubUsername} onChange={(value) => update('githubUsername', value)} inputClass={inputClass} />
            <Field label={applicationFieldLabels.repositoryUrl} required type="url" value={application.repositoryUrl} onChange={(value) => update('repositoryUrl', value)} inputClass={inputClass} />
            <div><label htmlFor="role" className="text-xs font-medium text-white/75">{applicationFieldLabels.role} <span className="text-rose-300">*</span></label><select id="role" value={application.role} onChange={(event) => update('role', event.target.value)} className={inputClass}><option value="">Choose a role</option><option>Maintainer</option><option>Owner</option><option>Contributor</option><option>Other</option></select></div>
            <div className="sm:col-span-2"><label htmlFor="security-interest" className="text-xs font-medium text-white/75">{applicationFieldLabels.securityInterest} <span className="text-rose-300">*</span></label><select id="security-interest" value={application.securityInterest} onChange={(event) => update('securityInterest', event.target.value)} className={inputClass}><option value="">Choose one</option><option>Yes</option><option>No</option><option>Not sure</option></select></div>
            <Field label={applicationFieldLabels.organizationId} value={application.organizationId} onChange={(value) => update('organizationId', value)} inputClass={inputClass} hint="Enter this only if you know it. Do not guess." />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">Review your answers</h2><p className="mt-1 text-xs text-white/45">Drafts are based on the local repository and avoid unverified adoption or license claims.</p></div><button type="button" onClick={() => { setApplication((current) => ({ ...current, ...drafts })); }} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/[0.06]">Use suggested drafts</button></div>
          <div className="mt-5 space-y-5">
            {applicationTextFields.map(({ key, label, required, hint }) => <TextAnswer key={key} fieldKey={key} label={label} required={required} hint={hint} value={application[key]} onChange={(value) => update(key, value)} onCopy={() => void copy(key)} copied={copied === key} />)}
          </div>
        </section>

        {missing.length > 0 && <div role="status" className="rounded-xl border border-amber-200/15 bg-amber-100/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/80">Checklist: {missing.map((key) => applicationFieldLabels[key]).join(' · ')}{application.licenseStatus === 'No public license found' && ' · a public open-source license is needed before making an eligibility claim'}{application.licenseStatus === 'Not sure yet' && ' · verify the repository license before preparing a final application'}</div>}
        {missing.length === 0 && application.licenseStatus === 'Has a public open-source license' && <div role="status" className="rounded-xl border border-emerald-200/15 bg-emerald-100/[0.04] px-4 py-3 text-xs text-emerald-100/80">Required fields are filled. Confirm all details against the official form before copying.</div>}
        {copyError && <p role="alert" className="text-sm text-rose-200">{copyError}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.06]"><RotateCcw size={16} /> Reset and clear</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={missing.length > 0} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40">Preview application</button>
            <button type="button" onClick={() => void copy('all')} disabled={missing.length > 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--accent-foreground)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{copied === 'all' ? <Check size={16} /> : <Clipboard size={16} />}{copied === 'all' ? 'Copied' : 'Copy complete application'}</button>
          </div>
        </div>
      </form>

      {showPreview && <section className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="preview-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="preview-heading" className="text-lg font-semibold text-white">Application preview</h2><p className="mt-1 text-xs text-white/45">Review each answer before using it on the official form.</p></div><button type="button" onClick={() => void copy('all')} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80">{copied === 'all' ? <Check size={14} /> : <Clipboard size={14} />} Copy all</button></div><pre className="mt-5 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-black/20 p-4 text-xs leading-6 text-white/70">{answer}</pre></section>}

      <footer className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="max-w-2xl text-xs leading-5 text-white/45">This helper only prepares and copies text. It never collects passwords or API keys, fills a browser form, or submits an application.</p>
        <a href={OFFICIAL_APPLICATION_URL} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/25 px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/10">Open official application <ExternalLink size={15} /></a>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, inputClass, required, hint, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; inputClass: string; required?: boolean; hint?: string; type?: string; autoComplete?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <div><label htmlFor={id} className="text-xs font-medium text-white/75">{label} {required && <span className="text-rose-300">*</span>}</label><input id={id} type={type} required={required} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />{hint && <p className="mt-1.5 text-[11px] leading-4 text-white/40">{hint}</p>}</div>;
}

function TextAnswer({ fieldKey, label, value, onChange, onCopy, copied, required, hint }: { fieldKey: keyof Application; label: string; value: string; onChange: (value: string) => void; onCopy: () => void; copied: boolean; required?: boolean; hint?: string }) {
  const id = `application-${fieldKey}`;
  return <div><div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-xs font-medium text-white/75">{label} {required && <span className="text-rose-300">*</span>}</label><button type="button" onClick={onCopy} disabled={!value.trim()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30">{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy answer'}</button></div><textarea id={id} required={required} maxLength={APPLICATION_TEXT_LIMIT} rows={4} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-counter ${hint ? `${id}-hint` : ''}`} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15" />{hint && <p id={`${id}-hint`} className="mt-1.5 text-[11px] leading-4 text-white/40">{hint}</p>}<p id={`${id}-counter`} className={`mt-1 text-right text-[10px] ${value.length >= APPLICATION_TEXT_LIMIT ? 'text-amber-200' : 'text-white/35'}`}>{value.length}/{APPLICATION_TEXT_LIMIT}</p></div>;
}
