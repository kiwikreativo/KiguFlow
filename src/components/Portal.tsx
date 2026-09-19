import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  DownloadSimple,
  File,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api } from "@/lib/api";
type PortalData = {
  id: string;
  name: string;
  description: string | null;
  clientName: string;
  status: string;
  dueDate: string | null;
  progress: number;
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
  brief: {id:string;title:string;status:string;fieldsSnapshot:Array<{id:string;label:string;type:string;required:boolean;options?:string[]}>;responses:Array<{fieldId:string;value:unknown}>}|null;
};
export function Portal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null),
    [error, setError] = useState("");
  const load = () =>
    api<PortalData>(`/portal/${token}`)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Portal unavailable"),
      );
  useEffect(() => {
    void load();
  }, [token]);
  async function complete(id: string) {
    try {
      await api(`/portal/${token}/tasks/${id}/complete`, { method: "POST" });
      toast.success("Task completed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete task");
    }
  }
  async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();try{await api(`/portal/${token}/files`,{method:'POST',body:new FormData(e.currentTarget)});e.currentTarget.reset();toast.success('File uploaded');load()}catch(x){toast.error(x instanceof Error?x.message:'Upload failed')}}
  async function saveBrief(element:HTMLFormElement,submit=false){if(!data?.brief)return;const form=new FormData(element);const responses=Object.fromEntries(data.brief.fieldsSnapshot.map(field=>[field.id,field.type==='checkbox'?form.get(field.id)==='on':form.get(field.id)||'']));try{await api(`/portal/${token}/brief`,{method:'PUT',body:JSON.stringify({responses,submit})});toast.success(submit?'Brief submitted':'Draft saved');load()}catch(x){toast.error(x instanceof Error?x.message:'Could not save brief')}}
  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[#17201d] p-6 text-white">
        <div className="max-w-md text-center">
          <WarningCircle className="mx-auto" size={42} />
          <h1 className="mt-5 text-3xl font-semibold">Portal unavailable</h1>
          <p className="mt-3 text-white/60">{error}</p>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1e9]">
        Loading your project…
      </main>
    );
  const actions = data.tasks.filter(
    (t) => t.requiresClientAction && t.status !== "completed",
  );
  return (
    <main className="min-h-screen bg-[#010A04] pb-24 text-white">
      <Toaster richColors />
      <header className="border-b border-white/10 bg-[#050f08] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <strong className="text-lg tracking-[-.04em] text-[#4ADE80]">KiguFlow</strong>
          <span className="flex items-center gap-2 text-xs text-white/55">
            <LockKey />
            Private client portal
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#737a76]">Welcome, {data.clientName}</p>
        <h1 className="mt-2 max-w-4xl text-[clamp(2.7rem,7vw,6.5rem)] font-semibold leading-[.92] tracking-[-.065em]">
          {data.name}
        </h1>
        <section className="mt-12 grid gap-3 md:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[8px] border border-[#4ADE80]/25 bg-[#4ADE80] p-6 text-[#010A04] md:p-9">
            <div className="flex justify-between">
              <span className="text-sm font-semibold">Project progress</span>
              <strong className="text-3xl">{data.progress}%</strong>
            </div>
            <div className="mt-16 h-3 overflow-hidden rounded-full bg-[#17201d]/15">
              <div
                className="h-full bg-[#17201d]"
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-[#39443f]">
              Progress is calculated from completed project tasks.
            </p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-[#191C21] p-6 text-white md:p-9">
            <p className="text-sm text-white/50">Current status</p>
            <p className="mt-2 text-2xl font-semibold capitalize">
              {data.status.replaceAll("_", " ")}
            </p>
            <p className="mt-10 text-sm text-white/50">Next date</p>
            <p className="mt-1 font-semibold">
              {data.dueDate
                ? new Date(`${data.dueDate}T00:00:00`).toLocaleDateString()
                : "To be confirmed"}
            </p>
          </div>
        </section>
        {actions.length > 0 && (
          <section className="mt-10 rounded-[8px] border border-[#4ADE80]/25 bg-[#4ADE80]/[.07] p-6 md:p-9">
            <h2 className="text-2xl font-semibold tracking-[-.04em]">
              Your attention is needed
            </h2>
            <p className="mt-2 text-[#6c6254]">
              {actions.length}{" "}
              {actions.length === 1 ? "item needs" : "items need"} your input.
            </p>
            <div className="mt-6 grid gap-3">
              {actions.map((t) => (
                <article className="flex flex-col justify-between gap-4 rounded-[8px] border border-white/10 bg-[#191C21] p-5 sm:flex-row sm:items-center">
                  <div>
                    <strong>{t.title}</strong>
                    {t.dueDate && (
                      <p className="text-sm text-[#777]">
                        Due{" "}
                        {new Date(`${t.dueDate}T00:00:00`).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {t.assigneeType === "client" && (
                    <button
                      onClick={() => complete(t.id)}
                      className="btn-primary"
                    >
                      <Check />
                      Mark complete
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
              Project timeline
            </h2>
            <p className="mt-3 text-[#6e7571]">
              A clear view of where the project stands.
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
                  {p.status.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-20">
          <h2 className="text-3xl font-semibold tracking-[-.045em]">
            Visible project tasks
          </h2>
          <div className="surface mt-6 divide-y divide-[#deddd6] rounded-2xl">
            {data.tasks.map((t) => (
              <div className="flex items-center gap-4 p-5">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border ${t.status === "completed" ? "bg-[#77953b] text-white" : "border-[#aaa]"}`}
                >
                  {t.status === "completed" && <Check />}
                </span>
                <div>
                  <strong
                    className={
                      t.status === "completed" ? "line-through opacity-60" : ""
                    }
                  >
                    {t.title}
                  </strong>
                  <p className="text-xs capitalize text-[#777]">
                    {t.status.replaceAll("_", " ")}
                  </p>
                </div>
                {t.assigneeType === "client" && t.status !== "completed" && (
                  <button
                    onClick={() => complete(t.id)}
                    className="btn-secondary ml-auto"
                  >
                    Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="mt-20 grid gap-4 md:grid-cols-2">
          <div className="surface rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">Files</h2>
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
                  <a href={`/api/portal/${token}/files/${f.id}/download`} aria-label={`Download ${f.filename}`}><DownloadSimple /></a>
                </div>
              ))}
              {!data.files.length && (
                <p className="py-8 text-sm text-[#777]">No shared files yet.</p>
              )}
            </div>
            <form onSubmit={upload} className="mt-5 grid gap-3 border-t border-white/10 pt-5"><input className="field" type="file" name="file" required/><input className="field" name="category" defaultValue="Client uploads"/><button className="btn-secondary">Upload a file</button></form>
          </div>
          <div className="surface rounded-3xl p-6">
            <h2 className="text-2xl font-semibold">Invoices</h2>
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
                    <p className="text-xs uppercase text-[#777]">{i.status}</p>
                  </div>
                </div>
              ))}
              {!data.invoices.length && (
                <p className="py-8 text-sm text-[#777]">No invoices to show.</p>
              )}
            </div>
          </div>
        </section>
        {data.brief&&<section className="surface mt-20 rounded-2xl p-6 md:p-9"><div className="flex justify-between"><h2 className="text-3xl font-semibold">{data.brief.title}</h2><span className="badge">{data.brief.status.replaceAll('_',' ')}</span></div><form className="mt-8 grid gap-5" onSubmit={e=>{e.preventDefault();void saveBrief(e.currentTarget,false)}}>{data.brief.fieldsSnapshot.map(field=>{const value=data.brief?.responses.find(r=>r.fieldId===field.id)?.value;return <label className="label">{field.label}{field.required?' *':''}{field.type==='long_text'?<textarea className="field min-h-28" name={field.id} defaultValue={String(value||'')} required={field.required}/>:field.type==='select'?<select className="field" name={field.id} defaultValue={String(value||'')} required={field.required}><option value="">Choose…</option>{field.options?.map(x=><option value={x}>{x}</option>)}</select>:field.type==='checkbox'?<input type="checkbox" name={field.id} defaultChecked={value===true}/>:field.type==='file'?<p className="text-sm text-[#777]">Upload this file in the Files section and use the requested category.</p>:<input className="field" name={field.id} type={field.type==='email'?'email':field.type==='url'?'url':'text'} defaultValue={String(value||'')} required={field.required}/>}</label>})}<div className="flex gap-3"><button className="btn-secondary">Save draft</button><button className="btn-primary" type="button" onClick={e=>{if(e.currentTarget.form)void saveBrief(e.currentTarget.form,true)}}>Submit brief</button></div></form></section>}
      </div>
    </main>
  );
}
