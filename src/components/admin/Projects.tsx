import { useEffect, useState, type FormEvent } from "react";
import { Plus, ArrowUpRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api, isAbortError, isAuthenticationError } from "@/lib/api";
import { projectStatusLabel } from "@/lib/project-status";
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
type Client = { id: string; name: string; companyName: string | null; email: string };
type Template = { id: string; name: string };
type Catalog = { services: Array<{id:string;name:string}>; bundles:Array<{id:string;name:string;serviceIds:string[]}> };
export function Projects() {
  const [rows, setRows] = useState<Project[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [templates, setTemplates] = useState<Template[]>([]),
    [catalog, setCatalog] = useState<Catalog>({services:[],bundles:[]}),
    [open, setOpen] = useState(false),
    [creating, setCreating] = useState(false),
    [search, setSearch] = useState("");
  const load = (signal?: AbortSignal) =>
    Promise.all([
      api<Project[]>("/admin/projects", { signal }),
      api<Client[]>("/admin/clients", { signal }),
      api<Template[]>("/admin/templates", { signal }),
      api<Catalog>("/admin/service-catalog", { signal }),
    ])
      .then(([a, b, c, d]) => {
        setRows(a);
        setClients(b);
        setTemplates(c);
        setCatalog(d);
      });
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((error) => {
      if (isAbortError(error)) return;
      if (isAuthenticationError(error)) location.href = "/login";
      else toast.error(error instanceof Error ? error.message : "Could not load projects");
    });
    return () => controller.abort();
  }, []);
  const query = search.trim().toLowerCase();
  const visibleRows = query ? rows.filter((project) => [project.name, project.clientName, project.status.replaceAll("_", " "), project.id].some((value) => value.toLowerCase().includes(query))) : rows;
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if(creating)return;
    setCreating(true);
    try {
      const p = await api<{ id: string }>("/admin/projects", {
        method: "POST",
        body: JSON.stringify({
          clientId: f.get("clientId"),
          name: f.get("name"),
          description: f.get("description") || null,
          serviceType: f.get("serviceType"),
          startingPoint: f.get("startingPoint"),
          status: "onboarding",
          startDate: f.get("startDate") || null,
          dueDate: f.get("dueDate") || null,
        }),
      });
      toast.success("Project created");
      location.href = `/projects/${p.id}`;
    } catch (x) {
      toast.error(x instanceof Error ? x.message : "Could not create project");
      setCreating(false);
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
      <div className="relative mb-5 max-w-xl">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" aria-hidden="true" />
        <label className="sr-only" htmlFor="project-search">Search projects</label>
        <input id="project-search" className="field field-search pr-11" type="search" placeholder="Search projects..." value={search} onChange={(event) => setSearch(event.target.value)} />
        {search && <button type="button" aria-label="Clear project search" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-white/5 hover:text-[var(--ink)]" onClick={() => setSearch("")}><X /></button>}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleRows.map((r) => (
          <a
            href={`/projects/${r.id}`}
            className="surface group rounded-2xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="flex justify-between">
              <span className="badge project-status" data-status={r.status}>{projectStatusLabel(r.status)}</span>
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
        {!visibleRows.length && (
          <div className="surface col-span-full rounded-2xl p-14 text-center">
            <h2 className="text-xl font-semibold">{rows.length ? "No projects found." : "No projects yet"}</h2>
            <p className="mt-2 text-[#777]">
              {rows.length ? "Try another name, client, status, or project ID." : "Create your first project to organize tasks, files, and client progress."}
            </p>
            {rows.length > 0 && <button type="button" className="btn-secondary mt-5" onClick={() => setSearch("")}>Clear search</button>}
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
                  <option value={c.id}>
                    {[c.name, c.companyName, c.email].filter(Boolean).join(" — ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Project name
              <input name="name" className="field" required />
            </label>
            <label className="label">
              Service / bundle
              <select name="serviceType" className="field" required>
                <option value="">Choose a service or bundle</option>
                <optgroup label="Services">
                  {catalog.services.map((service) => <option value={service.name}>{service.name}</option>)}
                </optgroup>
                <optgroup label="Bundles">
                  {catalog.bundles.map((bundle) => <option value={bundle.name}>{bundle.name}</option>)}
                </optgroup>
              </select>
            </label>
            <label className="label">
              Description
              <textarea name="description" className="field min-h-24" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <select name="startingPoint" className="field" required>
                <option value="">Choose a starting point</option>
                <optgroup label="Workflow stage">
                  <option value="stage:scratch">Start from scratch</option>
                  <option value="stage:discovery_completed">Discovery completed</option>
                  <option value="stage:design_approved">Design approved</option>
                  <option value="stage:development_started">Development started</option>
                  <option value="stage:existing_site">Existing site / live product</option>
                </optgroup>
                <optgroup label="Reusable workflows">
                  {templates.map((template) => <option value={`template:${template.id}`}>{template.name}</option>)}
                </optgroup>
              </select>
            </label>
            <button className="btn-primary mt-3" disabled={creating}>{creating ? 'Creating project…' : 'Create project'}</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
