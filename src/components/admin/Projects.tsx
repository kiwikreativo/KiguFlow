import { useEffect, useState, type FormEvent } from "react";
import { Plus, ArrowUpRight } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api } from "@/lib/api";
import { Shell } from "./Shell";
import { Modal } from "./Modal";
type Project = {
  id: string;
  name: string;
  clientName: string;
  status: string;
  dueDate: string | null;
  serviceType: string | null;
};
type Client = { id: string; name: string };
type Template = { id: string; name: string };
export function Projects() {
  const [rows, setRows] = useState<Project[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [templates, setTemplates] = useState<Template[]>([]),
    [open, setOpen] = useState(false);
  const load = () =>
    Promise.all([
      api<Project[]>("/admin/projects"),
      api<Client[]>("/admin/clients"),
      api<Template[]>("/admin/templates"),
    ])
      .then(([a, b, c]) => {
        setRows(a);
        setClients(b);
        setTemplates(c);
      })
      .catch(() => (location.href = "/login"));
  useEffect(() => {
    load();
  }, []);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const p = await api<{ id: string }>("/admin/projects", {
        method: "POST",
        body: JSON.stringify({
          clientId: f.get("clientId"),
          name: f.get("name"),
          description: f.get("description") || null,
          serviceType: f.get("serviceType") || null,
          status: "onboarding",
          startDate: f.get("startDate") || null,
          dueDate: f.get("dueDate") || null,
          templateId: f.get("templateId") || null,
        }),
      });
      toast.success("Project created");
      location.href = `/projects/${p.id}`;
    } catch (x) {
      toast.error(x instanceof Error ? x.message : "Could not create project");
    }
  }
  return (
    <Shell
      title="Projects"
      action={
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus />
          New project
        </button>
      }
    >
      <Toaster richColors />
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <a
            href={`/projects/${r.id}`}
            className="surface group rounded-2xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="flex justify-between">
              <span className="badge">{r.status.replaceAll("_", " ")}</span>
              <ArrowUpRight className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <h2 className="mt-12 text-2xl font-semibold tracking-[-.04em]">
              {r.name}
            </h2>
            <p className="mt-1 text-[#747b77]">
              {r.clientName} · {r.serviceType || "Custom project"}
            </p>
            <p className="mt-7 text-sm">
              {r.dueDate
                ? `Due ${new Date(`${r.dueDate}T00:00:00`).toLocaleDateString()}`
                : "No due date"}
            </p>
          </a>
        ))}
        {!rows.length && (
          <div className="surface col-span-full rounded-2xl p-14 text-center">
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="mt-2 text-[#777]">
              Create your first project to organize tasks, files, and client
              progress.
            </p>
          </div>
        )}
      </div>
      {open && (
        <Modal title="Create a project" onClose={() => setOpen(false)}>
          <form onSubmit={create} className="grid gap-4">
            <label className="label">
              Client
              <select name="clientId" required className="field">
                <option value="">Choose client</option>
                {clients.map((c) => (
                  <option value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Project name
              <input name="name" className="field" required />
            </label>
            <label className="label">
              Service type
              <input
                name="serviceType"
                className="field"
                placeholder="Website development"
              />
            </label>
            <label className="label">
              Description
              <textarea name="description" className="field min-h-24" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                Start date
                <input type="date" name="startDate" className="field" />
              </label>
              <label className="label">
                Due date
                <input type="date" name="dueDate" className="field" />
              </label>
            </div>
            <label className="label">
              Starting point
              <select name="templateId" className="field">
                <option value="">Start from scratch</option>
                {templates.map((t) => (
                  <option value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary mt-3">Create project</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
