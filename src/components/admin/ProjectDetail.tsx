import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Plus, Trash } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api } from "@/lib/api";
import { Shell } from "./Shell";
import { Modal } from "./Modal";
type Phase = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
};
type Task = {
  id: string;
  phaseId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeType: string;
  dueDate: string | null;
  clientVisible: boolean;
  requiresClientAction: boolean;
  sortOrder: number;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  amountMinor: number;
  currency: string;
  status: string;
  dueDate: string | null;
};
type Project = {
  id: string;
  name: string;
  description: string | null;
  serviceType: string | null;
  status: string;
  dueDate: string | null;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string;
  phases: Phase[];
  tasks: Task[];
  invoices: Invoice[];
  progress: number;
  activity: Array<{ id: string; summary: string; createdAt: string }>;
  files: Array<{id:string;filename:string;category:string;size:number;clientVisible:boolean;uploadedBy:string}>;
  documents: Array<{id:string;title:string;category:string;status:string}>;
  brief: {id:string;title:string;status:string}|null;
  portalTokens: Array<{id:string;expiresAt:string|null;revokedAt:string|null;createdAt:string}>;
};
type Client = { id: string; name: string; companyName: string | null; email: string };
type BriefField={id:string;label:string;type:string;required:boolean;options?:string[]};
type Brief={id:string;title:string;status:string;submittedAt:string|null;fieldsSnapshot:BriefField[];responses:Array<{fieldId:string;value:unknown}>};
export function ProjectDetail({ id }: { id: string }) {
  const [data, setData] = useState<Project | null>(null),
    [modal, setModal] = useState<"project" | "task" | "phase" | "invoice" | null>(null),
    [briefTemplates,setBriefTemplates]=useState<Array<{id:string;name:string}>>([]),
    [briefs,setBriefs]=useState<Brief[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [inviteOpen, setInviteOpen] = useState(false),
    [selectedClientId, setSelectedClientId] = useState(""),
    [inviting, setInviting] = useState(false);
  const load = () =>
    Promise.all([api<Project>(`/admin/projects/${id}`),api<Brief[]>(`/admin/projects/${id}/brief`)])
      .then(([project,projectBriefs])=>{setData(project);setBriefs(projectBriefs)})
      .catch(() => (location.href = "/projects"));
  useEffect(() => {
    void load();
    void api<Array<{id:string;name:string}>>('/admin/brief-templates').then(setBriefTemplates);
    void api<Client[]>('/admin/clients').then(setClients);
  }, [id]);
  const byPhase = useMemo(
    () =>
      Object.fromEntries(
        (data?.phases || []).map((p) => [
          p.id,
          (data?.tasks || []).filter((t) => t.phaseId === p.id),
        ]),
      ),
    [data],
  );
  async function mutate(path: string, body: unknown, method = "POST") {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setModal(null);
      toast.success("Changes saved");
      load();
    } catch (x) {
      toast.error(x instanceof Error ? x.message : "Could not save changes");
    }
  }
  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(`/admin/projects/${id}/tasks`, {
      title: f.get("title"),
      description: f.get("description") || null,
      phaseId: f.get("phaseId") || null,
      status: f.get("status"),
      priority: f.get("priority"),
      assigneeType: f.get("assigneeType"),
      dueDate: f.get("dueDate") || null,
      clientVisible: f.get("clientVisible") === "on",
      requiresClientAction: f.get("requiresClientAction") === "on",
    });
  }
  async function createPhase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(`/admin/projects/${id}/phases`, {
      name: f.get("name"),
      description: f.get("description") || null,
      status: "not_started",
      sortOrder: data?.phases.length || 0,
    });
  }
  async function createInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(`/admin/projects/${id}/invoices`, {
      invoiceNumber: f.get("invoiceNumber"),
      description: f.get("description"),
      amountMinor: Number(f.get("amountMinor")),
      currency: f.get("currency"),
      status: f.get("status"),
      issueDate: f.get("issueDate"),
      dueDate: f.get("dueDate") || null,
    });
  }
  async function updateTask(task: Task, patch: Partial<Task>) {
    await mutate(`/admin/tasks/${task.id}`, patch, "PATCH");
  }
  async function updateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await mutate(`/admin/projects/${id}`, {
      name: form.get("name"),
      description: form.get("description") || null,
      dueDate: form.get("dueDate") || null,
    }, "PATCH");
  }
  async function updateInvoice(invoiceId: string, status: string) {
    await mutate(`/admin/invoices/${invoiceId}`, { status }, "PATCH");
  }
  async function deleteTask(task: Task) {
    if (confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      await api(`/admin/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
      load();
    }
  }
  async function portal() {
    try {
      const result = await api<{ url: string }>(
        `/admin/projects/${id}/portal-token`,
        { method: "POST" },
      );
      await navigator.clipboard.writeText(result.url);
      toast.success("Secure portal link copied");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy portal link");
    }
  }
  function openInvitation() {
    setSelectedClientId(data?.clientId || "");
    setInviteOpen(true);
  }
  async function invite() {
    if (!data || !selectedClientId || inviting) return;
    setInviting(true);
    try {
      if (selectedClientId !== data.clientId) {
        await api(`/admin/projects/${id}/reassign`, {
          method: "POST",
          body: JSON.stringify({ clientId: selectedClientId }),
        });
      }
      const result = await api<{ url: string }>(`/admin/projects/${id}/portal-token`, { method: "POST" });
      await api(`/admin/projects/${id}/portal-invitation`, { method: "POST", body: JSON.stringify({ url: result.url }) });
      await load();
      setInviteOpen(false);
      toast.success("Portal invitation sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invitation failed");
      await load();
    } finally {
      setInviting(false);
    }
  }
  async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const body=new FormData(form);try{await api(`/admin/projects/${id}/files`,{method:'POST',body});form.reset();toast.success('File uploaded');load()}catch(x){toast.error(x instanceof Error?x.message:'Upload failed')}}
  async function filePatch(fileId:string,patch:unknown){await api(`/admin/files/${fileId}`,{method:'PATCH',body:JSON.stringify(patch)});load()}
  function briefResponses(brief:Brief,form:HTMLFormElement){const data=new FormData(form);return Object.fromEntries(brief.fieldsSnapshot.map(field=>[field.id,field.type==='checkbox'?data.get(field.id)==='on':data.get(field.id)||'']))}
  async function saveBrief(brief:Brief,form:HTMLFormElement,finalize=false){try{const responses=briefResponses(brief,form);await api(`/admin/briefs/${brief.id}/${finalize?'finalize':'draft'}`,{method:finalize?'POST':'PUT',body:JSON.stringify({responses})});toast.success(finalize?'Brief finalized.':'Draft saved.');load()}catch(error){toast.error(error instanceof Error?error.message:'Could not save brief')}}
  async function reopenBrief(brief:Brief){if(!confirm('Reopen this brief? The brief will become editable again and must be finalized once changes are complete.'))return;await api(`/admin/briefs/${brief.id}/reopen`,{method:'POST'});toast.success('Brief reopened.');load()}
  if (!data)
    return (
      <Shell title="Loading project…">
        <div className="surface h-72 animate-pulse rounded-2xl" />
      </Shell>
    );
  return (
    <Shell
      title={data.name}
      action={
        <div className="flex gap-2"><button className="btn-secondary" onClick={portal}>
          <Copy />
          Copy portal link
        </button><button className="btn-primary" onClick={openInvitation}>Email invitation</button></div>
      }
    >
      <Toaster richColors />
      {inviteOpen && (
        <Modal title="Send portal invitation" onClose={() => !inviting && setInviteOpen(false)}>
          <div className="grid gap-5">
            <div className="assignment-summary rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--ink-soft)]">Current assignment</p>
              <p className="mt-2 font-semibold">{data.clientName}</p>
              <p className="text-sm text-[var(--ink-soft)]">{data.clientCompany || "No company"}</p>
              <p className="mt-2 text-sm">Invitation goes to {data.clientEmail}</p>
            </div>
            <label className="label">
              Client
              <select className="field" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} disabled={inviting}>
                {clients.map((client) => (
                  <option value={client.id}>
                    {[client.name, client.companyName, client.email].filter(Boolean).join(" — ")}
                  </option>
                ))}
              </select>
            </label>
            {selectedClientId !== data.clientId && (
              <div className="reassignment-warning rounded-xl border p-4 text-sm">
                This permanently reassigns the project and revokes every existing portal link before sending the new invitation.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</button>
              <button className="btn-primary" onClick={invite} disabled={inviting || !selectedClientId}>
                {inviting ? "Sending…" : selectedClientId !== data.clientId ? "Reassign and send" : "Confirm and send"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <section className="grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
        <div className="surface rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#747b77]">
                {data.clientName} · {data.serviceType || "Custom project"}
              </p>
              <p className="mt-5 max-w-2xl leading-7">
                {data.description || "No description has been added."}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setModal("project")} className="btn-secondary">Edit project</button>
              <select
                aria-label="Project status"
                value={data.status}
                onChange={(e) =>
                  mutate(
                    `/admin/projects/${id}`,
                    { status: e.target.value },
                    "PATCH",
                  )
                }
                className="field w-auto"
              >
                <option value="onboarding">Onboarding</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_for_client">Waiting for client</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="mt-10">
            <div className="mb-2 flex justify-between text-sm">
              <span>Overall progress</span>
              <strong>{data.progress}%</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#dcdcd4]">
              <div
                className="h-full rounded-full bg-[#77953b] transition-all"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        </div>
        <aside className="rounded-2xl bg-[#17201d] p-6 text-white">
          <p className="text-sm text-white/50">Delivery snapshot</p>
          <p className="mt-6 text-4xl font-semibold">
            {data.tasks.filter((t) => t.status === "completed").length}
            <span className="text-white/35"> / {data.tasks.length}</span>
          </p>
          <p className="text-sm text-white/60">tasks completed</p>
          <p className="mt-8 text-sm text-white/50">Due date</p>
          <p className="mt-1 font-semibold">
            {data.dueDate
              ? new Date(`${data.dueDate}T00:00:00`).toLocaleDateString()
              : "Not set"}
          </p>
        </aside>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-[-.04em]">
            Project tasks
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setModal("phase")} className="btn-secondary">
              <Plus />
              Add phase
            </button>
            <button onClick={() => setModal("task")} className="btn-primary">
              <Plus />
              Add task
            </button>
          </div>
        </div>
        <div className="grid gap-4">
          {data.phases.map((phase) => (
            <article className="surface rounded-2xl">
              <header className="flex items-center justify-between gap-4 border-b border-[#deddd6] px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{phase.name}</h3>
                  <p className="text-xs text-[#777]">
                    {byPhase[phase.id]?.filter((t) => t.status === "completed")
                      .length || 0}{" "}
                    / {byPhase[phase.id]?.length || 0} completed
                  </p>
                </div>
                <select
                  aria-label={`${phase.name} status`}
                  value={phase.status}
                  onChange={(e) =>
                    mutate(
                      `/admin/phases/${phase.id}`,
                      { status: e.target.value },
                      "PATCH",
                    )
                  }
                  className="field w-auto max-w-[50%] shrink-0 text-sm"
                >
                  <option value="not_started">Not started</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </header>
              <div className="divide-y divide-[#e1e0d9]">
                {byPhase[phase.id]?.map((task) => (
                  <div
                    className={`group grid items-center gap-3 px-5 py-4 ${task.status === "completed" ? "opacity-55" : ""} md:grid-cols-[auto_1fr_150px_120px_auto]`}
                  >
                    <button
                      aria-label={
                        task.status === "completed"
                          ? `Reopen ${task.title}`
                          : `Complete ${task.title}`
                      }
                      onClick={() =>
                        updateTask(task, {
                          status:
                            task.status === "completed" ? "todo" : "completed",
                        })
                      }
                      className={`grid h-7 w-7 place-items-center rounded-full border ${task.status === "completed" ? "border-[#77953b] bg-[#77953b] text-white" : "border-[#a8aaa3]"}`}
                    >
                      {task.status === "completed" && <Check />}
                    </button>
                    <div>
                      <strong
                        className={
                          task.status === "completed" ? "line-through" : ""
                        }
                      >
                        {task.title}
                      </strong>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#777]">
                        <span className="capitalize">{task.priority}</span>
                        <span>·</span>
                        <span>
                          {task.assigneeType === "client" ? "Client" : "Admin"}
                        </span>
                        {task.requiresClientAction && (
                          <span className="font-semibold text-[#8a571f]">
                            Action required
                          </span>
                        )}
                      </div>
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateTask(task, { status: e.target.value })
                      }
                      className="field py-2 text-sm"
                    >
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="waiting_for_client">
                        Waiting for client
                      </option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                    </select>
                    <span className="text-sm text-[#727975]">
                      {task.dueDate
                        ? new Date(
                            `${task.dueDate}T00:00:00`,
                          ).toLocaleDateString()
                        : "No due date"}
                    </span>
                    <button
                      aria-label={`Delete ${task.title}`}
                      onClick={() => deleteTask(task)}
                      className="rounded-lg p-2 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash />
                    </button>
                  </div>
                ))}
                {!byPhase[phase.id]?.length && (
                  <p className="p-6 text-sm text-[#777]">
                    No tasks in this phase.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-2xl p-6 lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Client briefs</h2><form className="flex min-w-[280px] gap-2" onSubmit={async e=>{e.preventDefault();const templateId=String(new FormData(e.currentTarget).get('templateId'));await mutate(`/admin/projects/${id}/brief`,{templateId})}}><select className="field" name="templateId" required><option value="">Assign another brief</option>{briefTemplates.filter(template=>!briefs.some(brief=>brief.title===template.name)).map(template=><option value={template.id}>{template.name}</option>)}</select><button className="btn-secondary">Assign</button></form></div><div className="mt-6 grid gap-6">{briefs.map(brief=><section className="rounded-xl border border-white/10 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{brief.title}</h3><p className="mt-1 text-sm capitalize text-[#777]">{brief.status==='submitted'?'Finalized':brief.status.replaceAll('_',' ')}</p>{brief.submittedAt&&<p className="text-xs text-[#777]">Finalized {new Date(brief.submittedAt).toLocaleDateString()}</p>}</div>{brief.status==='submitted'&&<div className="flex gap-2"><button className="btn-secondary" onClick={()=>reopenBrief(brief)}>Reopen brief</button><a className="btn-primary" href={`/api/admin/briefs/${brief.id}/pdf`}>Download PDF</a></div>}</div>{brief.status==='submitted'?<div className="mt-7 grid gap-6">{brief.fieldsSnapshot.map(field=>{const value=brief.responses.find(response=>response.fieldId===field.id)?.value;return <div><p className="label">{field.label}</p>{field.type==='url'&&value?<a className="mt-2 block break-all text-[#4ADE80] underline" href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a>:<p className="mt-2 whitespace-pre-wrap leading-7">{value===true?'Yes':value===false?'No':String(value||'Not provided')}</p>}</div>})}</div>:<form className="mt-7 grid gap-5" onSubmit={e=>{e.preventDefault();void saveBrief(brief,e.currentTarget)}}>{brief.fieldsSnapshot.map(field=>{const value=brief.responses.find(response=>response.fieldId===field.id)?.value;return <label className="label">{field.label}{field.required?' *':''}{field.type==='long_text'?<textarea className="field min-h-28" name={field.id} defaultValue={String(value||'')}/>:field.type==='select'?<select className="field" name={field.id} defaultValue={String(value||'')}><option value="">Choose…</option>{field.options?.map(option=><option value={option}>{option}</option>)}</select>:field.type==='checkbox'?<span className="flex items-center gap-2 text-sm normal-case tracking-normal text-[var(--ink)]"><input type="checkbox" name={field.id} defaultChecked={value===true}/> Yes</span>:field.type==='file'?<p className="text-sm normal-case tracking-normal text-[#777]">Upload this file in the project Files section and record any related notes here.</p>:<input className="field" name={field.id} type={field.type==='email'?'email':field.type==='url'?'url':'text'} defaultValue={String(value||'')}/>}</label>})}<div className="flex flex-wrap justify-end gap-3"><button className="btn-secondary">Save draft</button><button className="btn-primary" type="button" onClick={event=>{const form=event.currentTarget.form;if(form)void saveBrief(brief,form,true)}}>Finalize brief</button></div></form>}</section>)}{!briefs.length&&<p className="text-sm text-[#777]">No brief is assigned to this project yet.</p>}</div></div>
        <div className="surface rounded-2xl p-6"><h2 className="text-xl font-semibold">Private project files</h2><form onSubmit={upload} className="mt-4 grid gap-3"><input className="field" type="file" name="file" required/><input className="field" name="category" placeholder="Category" defaultValue="General"/><label className="flex gap-2 text-sm"><input type="checkbox" name="clientVisible" value="true"/>Share with client</label><button className="btn-secondary">Upload file</button></form><div className="mt-5 divide-y divide-white/10">{data.files.map(f=><div className="flex items-center gap-3 py-3 text-sm"><a className="min-w-0 flex-1 truncate font-semibold" href={`/api/admin/files/${f.id}/download`}>{f.filename}</a><label className="flex items-center gap-2"><input type="checkbox" checked={f.clientVisible} onChange={e=>filePatch(f.id,{clientVisible:e.target.checked})}/>Shared</label><button className="text-red-400" onClick={async()=>{if(confirm('Delete this file?')){await api(`/admin/files/${f.id}`,{method:'DELETE'});load()}}}>Delete</button></div>)}</div></div>
        <div className="surface rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Invoices</h2>
            <button
              onClick={() => setModal("invoice")}
              className="btn-secondary"
            >
              <Plus />
              Add
            </button>
          </div>
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
                  <select
                    aria-label={`Status for invoice ${i.invoiceNumber}`}
                    value={i.status}
                    onChange={(event) => updateInvoice(i.id, event.target.value)}
                    className="field mt-2 py-1 text-xs uppercase"
                  >
                    {!['pending', 'half_paid', 'paid'].includes(i.status) && (
                      <option value={i.status} disabled>{i.status.replaceAll('_', '-')}</option>
                    )}
                    <option value="pending">Pending</option>
                    <option value="half_paid">Half-paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            ))}
            {!data.invoices.length && (
              <p className="py-8 text-sm text-[#777]">No invoices yet.</p>
            )}
          </div>
        </div>
        <div className="surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <div className="mt-5 divide-y divide-[#ddd]">
            {data.activity.slice(0, 6).map((a) => (
              <div className="py-3">
                <p className="text-sm">{a.summary}</p>
                <time className="text-xs text-[#777]">
                  {new Date(a.createdAt).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        </div>
      </section>
      {modal === "project" && (
        <Modal title="Edit project" onClose={() => setModal(null)}>
          <form onSubmit={updateProject} className="grid gap-4">
            <label className="label">
              Project name
              <input name="name" defaultValue={data.name} minLength={2} maxLength={180} required className="field" />
            </label>
            <label className="label">
              Description
              <textarea name="description" defaultValue={data.description || ""} maxLength={5000} className="field" />
            </label>
            <label className="label">
              Due date
              <input name="dueDate" type="date" defaultValue={data.dueDate || ""} className="field" />
            </label>
            <button className="btn-primary">Save project</button>
          </form>
        </Modal>
      )}
      {modal === "task" && (
        <Modal title="Add a project task" onClose={() => setModal(null)}>
          <form onSubmit={createTask} className="grid gap-4">
            <label className="label">
              Task name
              <input name="title" className="field" required />
            </label>
            <label className="label">
              Description
              <textarea name="description" className="field min-h-20" />
            </label>
            <label className="label">
              Phase
              <select name="phaseId" className="field">
                <option value="">No phase</option>
                {data.phases.map((p) => (
                  <option value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Status
                <select name="status" className="field">
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting_for_client">Waiting for client</option>
                  <option value="review">Review</option>
                </select>
              </label>
              <label className="label">
                Priority
                <select name="priority" className="field">
                  <option>medium</option>
                  <option>low</option>
                  <option>high</option>
                  <option>urgent</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Assigned to
                <select name="assigneeType" className="field">
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </label>
              <label className="label">
                Due date
                <input type="date" name="dueDate" className="field" />
              </label>
            </div>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" name="clientVisible" />
              Visible to client
            </label>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" name="requiresClientAction" />
              Requires client action
            </label>
            <button className="btn-primary">Create task</button>
          </form>
        </Modal>
      )}
      {modal === "phase" && (
        <Modal title="Add a project phase" onClose={() => setModal(null)}>
          <form onSubmit={createPhase} className="grid gap-4">
            <label className="label">
              Phase name
              <input name="name" required className="field" />
            </label>
            <label className="label">
              Description
              <textarea name="description" className="field" />
            </label>
            <button className="btn-primary">Create phase</button>
          </form>
        </Modal>
      )}
      {modal === "invoice" && (
        <Modal title="Create an invoice record" onClose={() => setModal(null)}>
          <form onSubmit={createInvoice} className="grid gap-4">
            <label className="label">
              Invoice number
              <input
                name="invoiceNumber"
                required
                className="field"
                placeholder="INV-001"
              />
            </label>
            <label className="label">
              Description
              <input name="description" required className="field" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Amount (whole units)
                <input
                  name="amountMinor"
                  type="number"
                  min="0"
                  required
                  className="field"
                />
              </label>
              <label className="label">
                Currency
                <select name="currency" className="field">
                  <option>USD</option>
                  <option>CRC</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Issue date
                <input
                  name="issueDate"
                  type="date"
                  required
                  className="field"
                />
              </label>
              <label className="label">
                Due date
                <input name="dueDate" type="date" className="field" />
              </label>
            </div>
            <label className="label">
              Status
              <select name="status" className="field">
                <option value="pending">Pending</option>
                <option value="half_paid">Half-paid</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <button className="btn-primary">Create invoice</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
