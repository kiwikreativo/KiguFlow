import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Shell } from "./Shell";
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeType: string;
  projectId: string;
  projectName: string;
  clientName: string;
};
type Project = { id: string; name: string; clientName: string };

const statuses = [
  { value: "", label: "All tasks", tone: "all" },
  { value: "todo", label: "To do", tone: "todo" },
  { value: "in_progress", label: "In progress", tone: "progress" },
  { value: "waiting_for_client", label: "Waiting for client", tone: "waiting" },
  { value: "review", label: "Review", tone: "review" },
  { value: "completed", label: "Completed", tone: "completed" },
] as const;

export function Tasks() {
  const [rows, setRows] = useState<Task[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [status, setStatus] = useState(""),
    [projectId, setProjectId] = useState("");
  useEffect(() => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (projectId) query.set("projectId", projectId);
    api<Task[]>(`/admin/tasks${query.size ? `?${query}` : ""}`)
      .then(setRows)
      .catch(() => (location.href = "/login"));
  }, [status, projectId]);
  useEffect(() => {
    api<Project[]>("/admin/projects")
      .then(setProjects)
      .catch(() => (location.href = "/login"));
  }, []);
  return (
    <Shell title="All tasks">
      <div className="surface rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-[#ddd] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Filter tasks by status">
          {statuses.map(({ value, label, tone }) => (
            <button
              type="button"
              onClick={() => setStatus(value)}
              aria-pressed={status === value}
              className={`task-filter task-filter-${tone} ${status === value ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
          </div>
          <label className="label min-w-56">
            Project
            <select className="field py-2" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">All projects</option>
              {projects.map((project) => (
                <option value={project.id}>{project.name} — {project.clientName}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="divide-y divide-[#deddd6]">
          {rows.map((t) => (
            <a
              href={`/projects/${t.projectId}`}
              className="grid gap-2 p-4 hover:bg-white/60 md:grid-cols-[1fr_220px_130px_100px]"
            >
              <div>
                <strong>{t.title}</strong>
                <p className="text-sm text-[#777]">{t.clientName}</p>
              </div>
              <span>{t.projectName}</span>
              <span className="badge w-fit">
                {t.status.replaceAll("_", " ")}
              </span>
              <span className="text-sm capitalize">{t.priority}</span>
            </a>
          ))}
          {!rows.length && (
            <p className="p-8 text-center text-sm text-[#777]">No tasks match these filters.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
