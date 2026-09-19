import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ClipboardText, Copy, Plus, Trash } from "@phosphor-icons/react";
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
  clientName: string;
  clientEmail: string;
  phases: Phase[];
  tasks: Task[];
  invoices: Invoice[];
  progress: number;
  activity: Array<{ id: string; summary: string; createdAt: string }>;
};
export function ProjectDetail({ id }: { id: string }) {
  const [data, setData] = useState<Project | null>(null),
    [modal, setModal] = useState<"task" | "phase" | "invoice" | null>(null);
  const load = () =>
    api<Project>(`/admin/projects/${id}`)
      .then(setData)
      .catch(() => (location.href = "/projects"));
  useEffect(() => {
    void load();
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
  async function deleteTask(task: Task) {
    if (confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      await api(`/admin/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
      load();
    }
  }
  async function portal() {
    const result = await api<{ url: string }>(
      `/admin/projects/${id}/portal-token`,
      { method: "POST" },
    );
    await navigator.clipboard.writeText(result.url);
    toast.success("Secure portal link copied");
  }
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
        <button className="btn-secondary" onClick={portal}>
          <Copy />
          Copy portal link
        </button>
      }
    >
      <Toaster richColors />
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
              <header className="flex items-center justify-between border-b border-[#deddd6] px-5 py-4">
                <div>
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
                  className="field w-auto text-sm"
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
                  <p className="text-xs uppercase text-[#777]">{i.status}</p>
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
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
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
