import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  CalendarBlank,
  DownloadSimple,
  File,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Modal } from "@/components/admin/Modal";
import { toast, Toaster } from "sonner";
import { api } from "@/lib/api";
import { projectStatusLabel } from "@/lib/project-status";
import { translator, translateStatus, type Language } from '@/i18n';
type PortalData = {
  id: string;
  name: string;
  description: string | null;
  clientName: string;
  status: string;
  dueDate: string | null;
  progress: number;
  preferredLanguage: Language;
  phases: Array<{ id: string; name: string; status: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assigneeType: string;
    requiresClientAction: boolean;
    dueDate: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    description: string;
    amountMinor: number;
    currency: string;
    status: string;
    dueDate: string | null;
  }>;
  files: Array<{
    id: string;
    filename: string;
    category: string;
    size: number;
  }>;
  activity: Array<{ id: string; summary: string; createdAt: string }>;
};
export function Portal({ token }: { token: string }) {
  const reportRequestKey = useRef<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null),
    [error, setError] = useState(""),
    [reportOpen, setReportOpen] = useState(false),
    [reporting, setReporting] = useState(false);
  const load = () =>
    api<PortalData>(`/portal/${token}`)
      .then(setData)
      .catch(() => setError(translator('en')('portalError')));
  useEffect(() => {
    void load();
  }, [token]);
  const language=data?.preferredLanguage||'en';
  const t=translator(language);
  async function complete(id: string) {
    try {
      await api(`/portal/${token}/tasks/${id}/complete`, { method: "POST" });
      toast.success(t("taskCompleted"));
      load();
    } catch (e) {
      toast.error(t("completeError"));
    }
  }
  async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;try{await api(`/portal/${token}/files`,{method:'POST',body:new FormData(form)});form.reset();toast.success(t('fileUploaded'));load()}catch{toast.error(t('uploadError'))}}
  async function reportProblem(e:FormEvent<HTMLFormElement>){e.preventDefault();if(reporting)return;setReporting(true);const form=e.currentTarget;const values=new FormData(form);reportRequestKey.current??=crypto.randomUUID();try{await api(`/portal/${token}/problem-reports`,{method:'POST',body:JSON.stringify({requestKey:reportRequestKey.current,category:values.get('category'),subject:values.get('subject'),description:values.get('description')})});reportRequestKey.current=null;form.reset();setReportOpen(false);toast.success(t('reportSuccess'),{description:t('reportSuccessDetail')})}catch{toast.error(t('reportError'))}finally{setReporting(false)}}
  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6 text-[var(--ink)]">
        <div className="max-w-md text-center">
          <WarningCircle className="mx-auto" size={42} />
          <h1 className="mt-5 text-3xl font-semibold">{t('portalUnavailable')}</h1>
          <p className="mt-3 text-white/60">{error}</p>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--paper)] text-[var(--ink)]">
        {t('loading')}
      </main>
    );
  const actions = data.tasks.filter(
    (task) => task.requiresClientAction && task.status !== "completed",
  );
  return (
    <main className="client-portal min-h-screen bg-[#010A04] pb-24 text-white">
      <Toaster richColors />
      {reportOpen && <Modal title={t('reportProblem')} onClose={()=>!reporting&&setReportOpen(false)}><p className="mb-5 leading-7 text-[var(--ink-soft)]">{t('reportDescription')}</p><form className="grid gap-4" onSubmit={reportProblem}><label className="label">{t('problemCategory')}<select className="field" name="category" required><option value="technical">{t('technicalIssue')}</option><option value="portal_access">{t('portalAccess')}</option><option value="files_documents">{t('filesDocuments')}</option><option value="tasks_project">{t('tasksProject')}</option><option value="other">{t('other')}</option></select></label><label className="label">{t('subject')}<input className="field" name="subject" minLength={3} maxLength={160} required placeholder={t('subjectPlaceholder')} /></label><label className="label">{t('problemDetails')}<textarea className="field min-h-36" name="description" minLength={10} maxLength={5000} required placeholder={t('problemPlaceholder')} /></label><div className="mt-3 flex justify-end gap-3"><button className="btn-secondary" type="button" disabled={reporting} onClick={()=>setReportOpen(false)}>{t('cancel')}</button><button className="btn-primary" disabled={reporting}>{reporting?t('sendingReport'):t('sendReport')}</button></div></form></Modal>}
      <header className="border-b border-white/10 bg-[#050f08] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <strong className="text-lg tracking-[-.04em] text-[#4ADE80]">KiguFlow</strong>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <a
              href="https://calendly.com/guillermo-obandoc/45min"
              target="_blank"
              rel="noreferrer"
              className="btn-primary px-3 py-2 text-sm"
            >
              <CalendarBlank />
              {t('bookCall')}
            </a>
            <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={()=>setReportOpen(true)}><WarningCircle />{t('reportProblem')}</button>
            <span className="hidden items-center gap-2 text-xs text-white/55 sm:flex">
              <LockKey />
              {t('privatePortal')}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#737a76]">{t('welcome')}, {data.clientName}</p>
        <h1 className="mt-2 max-w-4xl text-[clamp(2.7rem,7vw,6.5rem)] font-semibold leading-[.92] tracking-[-.065em]">
          {data.name}
        </h1>
        <section className="mt-12 grid gap-3 md:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[8px] border border-[#4ADE80]/25 bg-[#4ADE80] p-6 text-[#010A04] md:p-9">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">{t('projectProgress')}</span>
              <strong className="text-3xl">{data.progress}%</strong>
            </div>
            <div className="mt-16 h-3 overflow-hidden rounded-full bg-[#17201d]/15">
              <div
                className="h-full bg-[#17201d]"
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-[#39443f]">
              {t('progressHelp')}
            </p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-[#191C21] p-6 text-white md:p-9">
            <p className="text-sm text-white/50">{t('currentStatus')}</p>
            <p className="project-status project-status-text mt-2 text-2xl font-semibold" data-status={data.status}>
              {language === 'en' ? projectStatusLabel(data.status) : translateStatus(language,data.status)}
            </p>
            <p className="mt-10 text-sm text-white/50">{t('nextDate')}</p>
            <p className="mt-1 font-semibold">
              {data.dueDate
                ? new Date(`${data.dueDate}T00:00:00`).toLocaleDateString(language)
                : t('toBeConfirmed')}
            </p>
          </div>
        </section>
        {actions.length > 0 && (
          <section className="mt-10 rounded-[8px] border border-[#4ADE80]/25 bg-[#4ADE80]/[.07] p-6 md:p-9">
            <h2 className="text-2xl font-semibold tracking-[-.04em]">
              {t('attentionNeeded')}
            </h2>
            <p className="mt-2 text-[#6c6254]">
              {actions.length}{" "}
              {actions.length === 1 ? t('itemNeeds') : t('itemsNeed')} {t('yourInput')}
            </p>
            <div className="mt-6 grid gap-3">
              {actions.map((task) => (
                <article className="flex flex-col justify-between gap-4 rounded-[8px] border border-white/10 bg-[#191C21] p-5 sm:flex-row sm:items-center">
                  <div>
                    <strong>{task.title}</strong>
                    {task.dueDate && (
                      <p className="text-sm text-[#777]">
                        {t('due')}{" "}
                        {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(language)}
                      </p>
                    )}
                  </div>
                  {task.assigneeType === "client" && (
                    <button
                      onClick={() => complete(task.id)}
                      className="btn-primary"
                    >
                      <Check />
                      {t('markComplete')}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="mt-16 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-.045em]">
              {t('projectTimeline')}
            </h2>
            <p className="mt-3 text-[#6e7571]">
              {t('timelineHelp')}
            </p>
          </div>
          <div className="grid gap-2">
            {data.phases.map((p, i) => (
              <div className="surface flex items-center gap-4 rounded-2xl p-4">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${p.status === "completed" ? "bg-[#77953b] text-white" : p.status === "active" ? "bg-[#c7f36b]" : "bg-[#e5e3dc]"}`}
                >
                  {p.status === "completed" ? <Check /> : i + 1}
                </span>
                <strong>{p.name}</strong>
                <span className="ml-auto text-xs capitalize text-[#777]">
                  {translateStatus(language,p.status)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-20">
          <h2 className="text-3xl font-semibold tracking-[-.045em]">
            {t('visibleTasks')}
          </h2>
          <div className="surface mt-6 divide-y divide-[#deddd6] rounded-2xl">
            {data.tasks.map((task) => (
              <div className="flex items-center gap-4 p-5">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border ${task.status === "completed" ? "bg-[#77953b] text-white" : "border-[#aaa]"}`}
                >
                  {task.status === "completed" && <Check />}
                </span>
                <div>
                  <strong
                    className={
                      task.status === "completed" ? "line-through opacity-60" : ""
                    }
                  >
                    {task.title}
                  </strong>
                  <p className="text-xs capitalize text-[#777]">
                    {translateStatus(language,task.status)}
                  </p>
                </div>
                {task.assigneeType === "client" && task.status !== "completed" && (
                  <button
                    onClick={() => complete(task.id)}
                    className="btn-secondary ml-auto"
                  >
                    {t('complete')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="mt-20 grid gap-4 md:grid-cols-2">
          <div className="surface rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">{t('files')}</h2>
            <div className="mt-5 divide-y divide-[#ddd]">
              {data.files.map((f) => (
                <div className="flex items-center gap-3 py-4">
                  <File />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {f.filename}
                    </strong>
                    <span className="text-xs text-[#777]">{f.category}</span>
                  </div>
                  <a href={`/api/portal/${token}/files/${f.id}/download`} aria-label={`${t('download')} ${f.filename}`}><DownloadSimple /></a>
                </div>
              ))}
              {!data.files.length && (
                <p className="py-8 text-sm text-[#777]">{t('noFiles')}</p>
              )}
            </div>
            <form onSubmit={upload} className="mt-5 grid gap-3 border-t border-white/10 pt-5"><input className="field" type="file" name="file" required/><input className="field" name="category" defaultValue={t('clientUploads')}/><button className="btn-secondary">{t('uploadFile')}</button></form>
          </div>
          <div className="surface rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">{t('invoices')}</h2>
            <div className="mt-5 divide-y divide-[#ddd]">
              {data.invoices.map((i) => (
                <div className="flex justify-between py-4">
                  <div>
                    <strong>{i.invoiceNumber}</strong>
                    <p className="text-sm text-[#777]">{i.description}</p>
                  </div>
                  <div className="text-right">
                    <strong>
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: i.currency,
                        maximumFractionDigits: 0,
                      }).format(i.amountMinor)}
                    </strong>
                    <p className="text-xs uppercase text-[#777]">{translateStatus(language,i.status)}</p>
                  </div>
                </div>
              ))}
              {!data.invoices.length && (
                <p className="py-8 text-sm text-[#777]">{t('noInvoices')}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
