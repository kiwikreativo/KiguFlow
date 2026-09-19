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
export function Tasks() {
  const [rows, setRows] = useState<Task[]>([]),
    [status, setStatus] = useState("");
  useEffect(() => {
    api<Task[]>(`/admin/tasks${status ? `?status=${status}` : ""}`)
      .then(setRows)
      .catch(() => (location.href = "/login"));
  }, [status]);
  return (
    <Shell title="All tasks">
      <div className="surface rounded-2xl">
        <div className="flex flex-wrap gap-2 border-b border-[#ddd] p-4">
          {[
            "",
            "todo",
            "in_progress",
            "waiting_for_client",
            "review",
            "completed",
          ].map((s) => (
            <button
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${status === s ? "bg-[#17201d] text-white" : "bg-white"}`}
            >
              {s ? s.replaceAll("_", " ") : "All tasks"}
            </button>
          ))}
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
        </div>
      </div>
    </Shell>
  );
}
