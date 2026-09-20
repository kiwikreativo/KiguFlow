import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Shell } from "./Shell";
type Data = {
  activeProjects: number;
  clientActions: number;
  overdueTasks: number;
  dueSoon: number;
  recent: Array<{
    id: string;
    name: string;
    status: string;
    dueDate: string | null;
    clientName: string;
  }>;
};
export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/admin/dashboard")
      .then(setData)
      .catch(() => (location.href = "/login"));
  }, []);
  const stats = data
    ? [
        {
          label: "Active projects",
          value: data.activeProjects,
          Icon: CheckCircle,
        },
        {
          label: "Waiting on clients",
          value: data.clientActions,
          Icon: ClockCountdown,
        },
        { label: "Due this week", value: data.dueSoon, Icon: CalendarBlank },
        { label: "Overdue tasks", value: data.overdueTasks, Icon: Warning },
      ]
    : [];
  return (
    <Shell title="Welcome back">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <article className="surface rounded-2xl p-5">
            <Icon size={22} />
            <p className="mt-8 text-4xl font-semibold tracking-[-.05em]">
              {value}
            </p>
            <p className="mt-1 text-sm text-[#747b77]">{label}</p>
          </article>
        ))}
      </div>
      <section className="surface mt-6 rounded-2xl p-5 md:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recently updated</h2>
          <a href="/projects" className="text-sm font-semibold">
            All projects
          </a>
        </div>
        <div className="divide-y divide-[#deddd6]">
          {!data && (
            <p className="py-10 text-center text-[#777]">Loading workspace…</p>
          )}
          {data?.recent.map((project) => (
            <a
              href={`/projects/${project.id}`}
              className="group flex items-center gap-4 py-4"
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate">{project.name}</strong>
                <span className="text-sm text-[#777]">
                  {project.clientName}
                </span>
              </div>
              <span className="badge hidden sm:inline-flex">
                {project.status.replaceAll("_", " ")}
              </span>
              <ArrowUpRight className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
          ))}
        </div>
      </section>
    </Shell>
  );
}
