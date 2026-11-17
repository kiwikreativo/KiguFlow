import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowsInLineVertical, ArrowsOutLineVertical, CalendarBlank, CaretDown, CheckCircle, Copy, Plus, Trash } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api, ApiRequestError, isAbortError, isAuthenticationError } from "@/lib/api";
import { projectStatusLabel } from "@/lib/project-status";
import { Shell } from "./Shell";
import { Modal } from "./Modal";
import { PriorityDate } from "./Tasks";
import { assigneeOf, initials } from "./tasksView";
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
  assigneeName: string | null;
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
  files: Array<{id:string;filename:string;category:string;size:number;clientVisible:boolean;uploadedBy:string;scanStatus:'pending'|'clean'|'rejected'|'failed'}>;
  documents: Array<{id:string;title:string;category:string;status:string}>;
  brief: {id:string;title:string;status:string}|null;
  portalTokens: Array<{id:string;expiresAt:string|null;revokedAt:string|null;createdAt:string}>;
};
type Client = { id: string; name: string; companyName: string | null; email: string };
type BriefField={id:string;label:string;type:string;required:boolean;options?:string[]};
type Brief={id:string;title:string;status:string;submittedAt:string|null;fieldsSnapshot:BriefField[];responses:Array<{fieldId:string;value:unknown}>};
export function ProjectDetail({ id }: { id: string }) {
  const [data, setData] = useState<Project | null>(null),
    [modal, setModal] = useState<"project" | "task" | "phase" | "invoice" | "delete-project" | null>(null),
    [briefTemplates,setBriefTemplates]=useState<Array<{id:string;name:string}>>([]),
    [briefs,setBriefs]=useState<Brief[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [inviteOpen, setInviteOpen] = useState(false),
    [selectedClientId, setSelectedClientId] = useState(""),
    [inviting, setInviting] = useState(false),
    [deleteBriefTarget, setDeleteBriefTarget] = useState<Brief | null>(null),
    [deleteConfirmation, setDeleteConfirmation] = useState(""),
    [deleting, setDeleting] = useState(false),
    // Manual open/closed overrides; without one, completed phases start closed.
    [phaseOpen, setPhaseOpen] = useState<Record<string, boolean>>({});
  const isPhaseOpen = (p: Phase) => phaseOpen[p.id] ?? p.status !== "completed";
  const setPhaseOverride = (phaseId: string, open: boolean | undefined) =>
    setPhaseOpen(({ [phaseId]: _, ...rest }) => (open === undefined ? rest : { ...rest, [phaseId]: open }));
  const handleLoadError = (error:unknown) => {
    if (isAbortError(error)) return;
    if (isAuthenticationError(error)) location.href = "/login";
    else if (error instanceof ApiRequestError && error.status === 404) location.href = "/projects";
    else toast.error(error instanceof Error ? error.message : "Could not load project");
  };
  const load = (signal?:AbortSignal) =>
    Promise.all([api<Project>(`/admin/projects/${id}`,{signal}),api<Brief[]>(`/admin/projects/${id}/brief`,{signal})])
      .then(([project,projectBriefs])=>{setData(project);setBriefs(projectBriefs)})
      .catch(handleLoadError);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    void api<Array<{id:string;name:string}>>('/admin/brief-templates',{signal:controller.signal}).then(setBriefTemplates).catch(handleLoadError);
    void api<Client[]>('/admin/clients',{signal:controller.signal}).then(setClients).catch(handleLoadError);
    return () => controller.abort();
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
      assigneeName: f.get("assigneeName") || null,
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
  async function deleteBrief(){if(!deleteBriefTarget||deleting)return;setDeleting(true);try{await api(`/admin/briefs/${deleteBriefTarget.id}`,{method:'DELETE'});setDeleteBriefTarget(null);toast.success('Brief deleted');load()}catch(error){toast.error(error instanceof Error?error.message:'Could not delete brief')}finally{setDeleting(false)}}
  async function deleteProject(){if(deleteConfirmation!==data?.name||deleting)return;setDeleting(true);try{await api(`/admin/projects/${id}`,{method:'DELETE',body:JSON.stringify({name:deleteConfirmation})});location.href='/projects'}catch(error){toast.error(error instanceof Error?error.message:'Could not delete project');setDeleting(false)}}
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
        <div className="flex flex-wrap items-center gap-2"><button className="btn-secondary" onClick={portal}>
          <Copy size={15} aria-hidden="true" />
          Copy portal link
        </button><button className="btn-primary" onClick={openInvitation}>Email invitation</button><button className="btn-secondary !border-red-500/40 text-red-500" onClick={()=>{setDeleteConfirmation('');setModal('delete-project')}}>Delete project</button></div>
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
        <div className="dash-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--ink-soft)]">
                {data.clientName} · {data.serviceType || "Custom project"}
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-7">
                {data.description || "No description has been added."}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setModal("project")} className="tool-btn">Edit project</button>
              <select
                aria-label="Project status"
                value={data.status}
                data-status={data.status}
                onChange={(e) =>
                  mutate(
                    `/admin/projects/${id}`,
                    { status: e.target.value },
                    "PATCH",
                  )
                }
                className="field project-status w-auto"
              >
                <option value="onboarding">Onboarding</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_for_client">Waiting for client</option>
                <option value="review">{projectStatusLabel("review")}</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex justify-between text-xs text-[var(--ink-soft)]">
              <span>Overall progress</span>
              <strong className="text-[var(--ink)]">{data.progress}%</strong>
            </div>
            <span className="group-progress" style={{ width: "100%", height: 6 }} role="progressbar" aria-valuenow={data.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
              <span style={{ width: `${data.progress}%` }} />
            </span>
          </div>
        </div>
        <aside className="grid gap-3">
          <div className="stat-card" data-tone="completed">
            <div>
              <p className="text-xs text-[var(--ink-soft)]">Tasks completed</p>
              <p className="stat-value">
                {data.tasks.filter((t) => t.status === "completed").length}
                <span className="text-[var(--ink-faint)]"> / {data.tasks.length}</span>
              </p>
            </div>
            <span className="stat-icon" aria-hidden="true"><CheckCircle size={22} weight="bold" /></span>
          </div>
          <div className="stat-card">
            <div>
              <p className="text-xs text-[var(--ink-soft)]">Due date</p>
              <p className="stat-value">
                {data.dueDate
                  ? new Date(`${data.dueDate}T00:00:00`).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
            <span className="stat-icon" aria-hidden="true"><CalendarBlank size={22} weight="bold" /></span>
          </div>
        </aside>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-[-.03em]">Project tasks</h2>
            <span className="count-pill">{data.tasks.length} tasks</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.phases.length > 0 && (() => {
              const allClosed = data.phases.every((p) => !isPhaseOpen(p));
              return (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={() => setPhaseOpen(Object.fromEntries(data.phases.map((p) => [p.id, allClosed])))}
                >
                  {allClosed ? <ArrowsOutLineVertical size={15} aria-hidden="true" /> : <ArrowsInLineVertical size={15} aria-hidden="true" />}
                  {allClosed ? "Expand all" : "Collapse all"}
                </button>
              );
            })()}
            <button onClick={() => setModal("phase")} className="tool-btn">
              <Plus size={15} aria-hidden="true" />
              Add phase
            </button>
            <button onClick={() => setModal("task")} className="btn-primary">
              <Plus />
              Add task
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {data.phases.map((phase, phaseIndex) => {
            const open = isPhaseOpen(phase);
            const phaseTasks = byPhase[phase.id] ?? [];
            const done = phaseTasks.filter((t) => t.status === "completed").length;
            const progress = phaseTasks.length ? Math.round((done / phaseTasks.length) * 100) : 0;
            return (
            <section key={phase.id} className="task-group" aria-label={phase.name}>
              <div className="task-group-head">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${phase.name}`}
                  onClick={() => setPhaseOverride(phase.id, !open)}
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]"
                >
                  <CaretDown size={14} weight="bold" className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                </button>
                <span className="group-tile" aria-hidden="true">{phaseIndex + 1}</span>
                <strong className="truncate text-[15px] font-semibold">{phase.name}</strong>
                <span className="count-pill">{done} / {phaseTasks.length} done</span>
                <span className="hidden items-center gap-3 sm:flex">
                  <span className="group-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${phase.name} progress`}>
                    <span style={{ width: `${progress}%` }} />
                  </span>
                  <span className="text-xs text-[var(--ink-soft)]">{progress}%</span>
                </span>
                <select
                  aria-label={`${phase.name} status`}
                  value={phase.status}
                  onChange={(e) => {
                    // Let the new status decide: completing a phase closes it.
                    setPhaseOverride(phase.id, undefined);
                    void mutate(
                      `/admin/phases/${phase.id}`,
                      { status: e.target.value },
                      "PATCH",
                    );
                  }}
                  className="field ml-auto w-auto py-1.5 text-sm"
                >
                  <option value="not_started">Not started</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {open && (phaseTasks.length ? (
                <div className="task-table">
                  <div className="task-head" aria-hidden="true">
                    <span />
                    <span>Task title</span>
                    <span>Assignee</span>
                    <span>Status</span>
                    <span className="md:justify-self-end">Priority &amp; date</span>
                  </div>
                  {phaseTasks.map((task) => {
                    const completed = task.status === "completed";
                    const name = assigneeOf({ ...task, clientName: data.clientName });
                    return (
                    <div key={task.id} className="task-row group">
                      <input
                        type="checkbox"
                        className="task-check"
                        checked={completed}
                        onChange={() => updateTask(task, { status: completed ? "todo" : "completed" })}
                        aria-label={`Mark "${task.title}" as ${completed ? "to do" : "completed"}`}
                      />
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className={`task-title${completed ? " is-done" : ""}`}>{task.title}</span>
                        {task.requiresClientAction && <span className="count-pill">Action required</span>}
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--ink-soft)]">
                        <span className="task-avatar" aria-hidden="true">{initials(name)}</span>
                        <span className="truncate">{name}</span>
                      </span>
                      <select
                        aria-label={`${task.title} status`}
                        value={task.status}
                        onChange={(e) => updateTask(task, { status: e.target.value })}
                        className="field py-1.5 text-sm"
                      >
                        <option value="todo">To do</option>
                        <option value="in_progress">In progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="waiting_for_client">Waiting for client</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                      <span className="flex items-center gap-1 md:justify-self-end">
                        <PriorityDate task={task} />
                        <button
                          type="button"
                          aria-label={`Delete ${task.title}`}
                          onClick={() => deleteTask(task)}
                          className="rounded-md p-1.5 text-[var(--ink-soft)] opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash size={15} />
                        </button>
                      </span>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-[var(--ink-soft)]">No tasks in this phase.</p>
              ))}
            </section>
            );
          })}
        </div>
      </section>
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="dash-panel p-5 lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-[-.03em]">Client briefs</h2><form className="flex min-w-[280px] gap-2" onSubmit={async e=>{e.preventDefault();const templateId=String(new FormData(e.currentTarget).get('templateId'));await mutate(`/admin/projects/${id}/brief`,{templateId})}}><select className="field" name="templateId" required><option value="">Assign another brief</option>{briefTemplates.filter(template=>!briefs.some(brief=>brief.title===template.name)).map(template=><option value={template.id}>{template.name}</option>)}</select><button className="tool-btn">Assign</button></form></div><div className="mt-6 grid gap-6">{briefs.map(brief=><section className="rounded-xl border border-white/10 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{brief.title}</h3><p className="mt-1 text-sm capitalize text-[var(--ink-soft)]">{brief.status==='submitted'?'Finalized':brief.status.replaceAll('_',' ')}</p>{brief.submittedAt&&<p className="text-xs text-[var(--ink-soft)]">Finalized {new Date(brief.submittedAt).toLocaleDateString()}</p>}</div><div className="flex gap-2">{brief.status==='submitted'&&<><button className="btn-secondary" onClick={()=>reopenBrief(brief)}>Reopen brief</button><a className="btn-primary" href={`/api/admin/briefs/${brief.id}/pdf`}>Download PDF</a></>}<button type="button" className="rounded-[8px] border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-400" onClick={()=>setDeleteBriefTarget(brief)}>Delete</button></div></div>{brief.status==='submitted'?<div className="mt-7 grid gap-6">{brief.fieldsSnapshot.map(field=>{const value=brief.responses.find(response=>response.fieldId===field.id)?.value;return <div><p className="label">{field.label}</p>{field.type==='url'&&value?<a className="mt-2 block break-all text-[#4ADE80] underline" href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a>:<p className="mt-2 whitespace-pre-wrap leading-7">{value===true?'Yes':value===false?'No':String(value||'Not provided')}</p>}</div>})}</div>:<form className="mt-7 grid gap-5" onSubmit={e=>{e.preventDefault();void saveBrief(brief,e.currentTarget)}}>{brief.fieldsSnapshot.map(field=>{const value=brief.responses.find(response=>response.fieldId===field.id)?.value;return <label className="label">{field.label}{field.required?' *':''}{field.type==='long_text'?<textarea className="field min-h-28" name={field.id} defaultValue={String(value||'')}/>:field.type==='select'?<select className="field" name={field.id} defaultValue={String(value||'')}><option value="">Choose…</option>{field.options?.map(option=><option value={option}>{option}</option>)}</select>:field.type==='checkbox'?<span className="flex items-center gap-2 text-sm normal-case tracking-normal text-[var(--ink)]"><input type="checkbox" name={field.id} defaultChecked={value===true}/> Yes</span>:field.type==='file'?<p className="text-sm normal-case tracking-normal text-[var(--ink-soft)]">Upload this file in the project Files section and record any related notes here.</p>:<input className="field" name={field.id} type={field.type==='email'?'email':field.type==='url'?'url':'text'} defaultValue={String(value||'')}/>}</label>})}<div className="flex flex-wrap justify-end gap-3"><button className="btn-secondary">Save draft</button><button className="btn-primary" type="button" onClick={event=>{const form=event.currentTarget.form;if(form)void saveBrief(brief,form,true)}}>Finalize brief</button></div></form>}</section>)}{!briefs.length&&<p className="text-sm text-[var(--ink-soft)]">No brief is assigned to this project yet.</p>}</div></div>
        <div className="dash-panel p-5"><h2 className="text-xl font-semibold tracking-[-.03em]">Private project files</h2><form onSubmit={upload} className="mt-4 grid gap-3"><input className="field" type="file" name="file" required/><input className="field" name="category" placeholder="Category" defaultValue="General"/><label className="flex gap-2 text-sm"><input type="checkbox" name="clientVisible" value="true"/>Share with client</label><button className="tool-btn justify-center">Upload file</button></form><div className="mt-5 divide-y divide-white/10">{data.files.map(f=><div className="flex items-center gap-3 py-3 text-sm"><a className="min-w-0 flex-1 truncate font-semibold" href={`/api/admin/files/${f.id}/download`}>{f.filename}</a><label className="flex items-center gap-2"><input type="checkbox" checked={f.clientVisible} onChange={e=>filePatch(f.id,{clientVisible:e.target.checked})}/>Shared</label><button className="text-red-400" onClick={async()=>{if(confirm('Delete this file?')){await api(`/admin/files/${f.id}`,{method:'DELETE'});load()}}}>Delete</button></div>)}</div></div>
        <div className="dash-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-[-.03em]">Invoices</h2>
            <button
              onClick={() => setModal("invoice")}
              className="tool-btn"
            >
              <Plus size={15} aria-hidden="true" />
              Add
            </button>
          </div>
          <div className="mt-5 divide-y divide-[#ddd]">
            {data.invoices.map((i) => (
              <div className="flex justify-between py-4">
                <div>
                  <strong>{i.invoiceNumber}</strong>
                  <p className="text-sm text-[var(--ink-soft)]">{i.description}</p>
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
              <p className="py-8 text-sm text-[var(--ink-soft)]">No invoices yet.</p>
            )}
          </div>
        </div>
        <div className="dash-panel p-5">
          <h2 className="text-xl font-semibold tracking-[-.03em]">Recent activity</h2>
          <div className="mt-5 divide-y divide-[#ddd]">
            {data.activity.slice(0, 6).map((a) => (
              <div className="py-3">
                <p className="text-sm">{a.summary}</p>
                <time className="text-xs text-[var(--ink-soft)]">
                  {new Date(a.createdAt).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        </div>
      </section>
      {deleteBriefTarget && <Modal title="Delete brief?" onClose={()=>!deleting&&setDeleteBriefTarget(null)}><p className="leading-7 text-[var(--ink-soft)]">This brief will be removed from the assigned project. This action cannot be undone.</p><p className="mt-4 font-semibold">{deleteBriefTarget.title}</p><div className="mt-7 flex justify-end gap-3"><button className="btn-secondary" type="button" onClick={()=>setDeleteBriefTarget(null)} disabled={deleting}>Cancel</button><button className="rounded-[8px] bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50" type="button" onClick={deleteBrief} disabled={deleting}>{deleting?'Deleting…':'Delete brief'}</button></div></Modal>}
      {modal === "delete-project" && <Modal title="Delete project permanently?" onClose={()=>!deleting&&setModal(null)}><p className="leading-7 text-[var(--ink-soft)]">This will permanently delete the project and its exclusively related data, including tasks, briefs, and project-specific documents. Financial records will be retained.</p><p className="mt-5 font-semibold">Type <span className="text-[var(--ink)]">{data.name}</span> to confirm.</p><label className="label mt-4">Project name<input className="field" value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)} autoComplete="off" /></label><div className="mt-7 flex justify-end gap-3"><button className="btn-secondary" type="button" onClick={()=>setModal(null)} disabled={deleting}>Cancel</button><button className="rounded-[8px] bg-red-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={deleteProject} disabled={deleteConfirmation!==data.name||deleting}>{deleting?'Deleting…':'Delete permanently'}</button></div></Modal>}
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
                Assignee name
                <input name="assigneeName" maxLength={120} className="field" placeholder="e.g. Joss Segura" />
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
