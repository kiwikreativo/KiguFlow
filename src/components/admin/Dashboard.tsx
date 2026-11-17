import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarBlank,
  CaretRight,
  ClockCountdown,
  DotsThree,
  FolderOpen,
  Lightning,
  MagnifyingGlass,
  Plus,
  UsersThree,
  Warning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { api, isAbortError, isAuthenticationError } from "@/lib/api";
import { projectStatusLabel } from "@/lib/project-status";
import { Shell } from "./Shell";
import { initials } from "./tasksView";
import { fillDays, hubBadge, relativeTime, sparkPath, weekDelta, type Hub } from "./dashboardView";

type FocusTask = { id: string; title: string; priority: string; status: string; dueDate: string | null; projectId: string; clientName: string };
type Data = {
  activeProjects: number;
  clientActions: number;
  overdueTasks: number;
  dueSoon: number;
  newThisMonth: number;
  activeClients: number;
  nextDeadline: string | null;
  criticalOverdue: number;
  focusPending: number;
  recent: Array<{ id: string; name: string; status: string; dueDate: string | null; updatedAt: string; clientName: string; progress: number }>;
  openIssue: { id: string; subject: string; projectId: string; projectName: string; clientName: string; createdAt: string } | null;
  focus: FocusTask[];
  throughput: Array<{ day: string; count: number }>;
  sprint: { done: number; total: number };
  hubs: Array<Hub & { id: string; name: string }>;
};

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const weekday = (d: Date, isToday: boolean) => (isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }));
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function focusMeta(t: FocusTask) {
  if (t.priority === "urgent") return { text: "Critical", danger: true };
  if (t.dueDate) {
    const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
    return { text: t.dueDate < today ? `Overdue · ${shortDate(t.dueDate)}` : t.dueDate === today ? "Due today" : `Due ${shortDate(t.dueDate)}`, danger: t.dueDate < today };
  }
  return { text: t.status.replaceAll("_", " "), danger: false };
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [adminName, setAdminName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [modKey, setModKey] = useState("Ctrl");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const onError = (error: unknown) => {
      if (isAbortError(error)) return;
      if (isAuthenticationError(error)) location.href = "/login";
      else setLoadError(error instanceof Error ? error.message : "Could not load the dashboard.");
    };
    api<Data>("/admin/dashboard", { signal: controller.signal }).then(setData).catch(onError);
    api<{ name: string }>("/auth/me", { signal: controller.signal }).then((me) => setAdminName(me.name)).catch(onError);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isMac()) setModKey("⌘");
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const days = useMemo(() => fillDays(data?.throughput ?? []), [data]);
  const week = days.slice(-7);
  const delta = weekDelta(days.map((d) => d.count));
  const spark = sparkPath(week.map((d) => d.count), 300, 70);

  async function completeFocus(task: FocusTask) {
    const mark = (on: boolean) =>
      setDoneIds((current) => {
        const next = new Set(current);
        if (on) next.add(task.id);
        else next.delete(task.id);
        return next;
      });
    mark(true);
    try {
      await api(`/admin/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) });
    } catch (error) {
      mark(false);
      if (isAuthenticationError(error)) location.href = "/login";
      else setLoadError(error instanceof Error ? error.message : "Could not complete the task.");
    }
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    location.href = `/tasks${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`;
  };

  const issue = !dismissed ? data?.openIssue : null;
  const firstName = adminName.split(/\s+/)[0] ?? "";

  const stats: Array<{ label: string; value: number; sub: string; badge: string; tone: string; Icon: PhosphorIcon; danger?: boolean }> = data
    ? [
        { label: "Active projects", value: data.activeProjects, Icon: FolderOpen, badge: `+${data.newThisMonth} mo`, tone: "neutral", sub: `Across ${data.activeClients} client${data.activeClients === 1 ? "" : "s"} · +${data.newThisMonth} this month` },
        { label: "Waiting on clients", value: data.clientActions, Icon: ClockCountdown, badge: data.clientActions ? "Action needed" : "Clear", tone: data.clientActions ? "warn" : "good", sub: "Requires client feedback or assets" },
        { label: "Due this week", value: data.dueSoon, Icon: CalendarBlank, badge: data.overdueTasks ? "Watch" : "Healthy", tone: data.overdueTasks ? "warn" : "good", sub: data.nextDeadline ? `${data.overdueTasks ? "Behind" : "On track"} · Next deadline ${shortDate(data.nextDeadline)}` : "No upcoming deadlines" },
        { label: "Overdue tasks", value: data.overdueTasks, Icon: Warning, badge: data.overdueTasks ? "Review now" : "All clear", tone: data.overdueTasks ? "danger" : "good", danger: data.overdueTasks > 0, sub: data.criticalOverdue ? `${data.criticalOverdue} critical priority needs action` : data.overdueTasks ? "Past their due date" : "Nothing past due" },
      ]
    : [];

  const header = (
    <header className="mb-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)]">
          <span>Workspace</span>
          <CaretRight size={11} aria-hidden="true" />
          <span className="font-semibold text-[var(--ink)]">Overview</span>
        </nav>
        <div className="flex items-center gap-3">
          <form onSubmit={submitSearch} role="search" className="search-box dash-search">
            <MagnifyingGlass size={15} aria-hidden="true" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search tasks… (${modKey}K)`} aria-label="Search tasks" />
          </form>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="vertex-mono flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--accent-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" aria-hidden="true" /> KiguDev workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
            Welcome back{firstName && <span className="text-xl font-medium tracking-[-.02em] text-[var(--ink-soft)] md:text-2xl">, {firstName}</span>}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Here is a quick pulse of your clients, deliverables, and team bandwidth today.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/projects?new=1" className="create-btn">
            Create project
            <span className="create-btn-dot" aria-hidden="true"><Plus size={13} weight="bold" /></span>
          </a>
        </div>
      </div>
    </header>
  );

  return (
    <Shell title="Welcome back" header={header}>
      {loadError && <div className="surface mb-5 rounded-2xl p-5 text-red-500" role="alert">{loadError}</div>}

      {issue && (
        <section className="issue-banner mb-6" role="alert" aria-label="High priority client issue">
          <span className="issue-icon" aria-hidden="true"><Warning size={18} weight="bold" /></span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="issue-tag">High priority</span>
              <strong className="truncate text-[15px]">Client issue: {issue.subject}</strong>
            </p>
            <p className="mt-1 text-xs opacity-80">
              Project: {issue.projectName} · Reported by {issue.clientName} · {relativeTime(issue.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="tool-btn" onClick={() => setDismissed(true)}>Dismiss</button>
            <a href={`/projects/${issue.projectId}`} className="issue-resolve">
              Resolve issue <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </a>
          </div>
        </section>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data && !loadError && <p className="col-span-full py-10 text-center text-sm text-[var(--ink-soft)]">Loading workspace…</p>}
        {stats.map(({ label, value, sub, badge, tone, Icon, danger }) => (
          <article key={label} className="dash-card">
            <div className="flex items-start justify-between gap-2">
              <Icon size={20} className={danger ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"} aria-hidden="true" />
              <span className="dash-badge" data-tone={tone}>{badge}</span>
            </div>
            <p className={`mt-5 text-4xl font-semibold tracking-[-.05em] ${danger ? "text-[var(--danger)]" : ""}`}>{value}</p>
            <p className="mt-2 text-[15px] font-medium">{label}</p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{sub}</p>
          </article>
        ))}
      </div>

      {data && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-5">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-.03em]">
                  Recently updated <span className="count-pill font-normal">{data.activeProjects} active</span>
                </h2>
                <a href="/projects" className="flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
                  All projects <ArrowRight size={13} weight="bold" aria-hidden="true" />
                </a>
              </div>
              <div className="dash-panel divide-y divide-[var(--line)]">
                {data.recent.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap">
                    <span className="recent-tile project-status" data-status={p.status} aria-hidden="true">{initials(p.name)}</span>
                    <a href={`/projects/${p.id}`} className="min-w-0 flex-1 hover:underline">
                      <strong className="block truncate text-[15px] font-semibold">{p.name}</strong>
                      <span className="block truncate text-xs text-[var(--ink-soft)]">{p.clientName} · Updated {relativeTime(p.updatedAt)}</span>
                    </a>
                    <div className="w-full sm:w-36">
                      <div className="mb-1 flex justify-between text-[11px] text-[var(--ink-soft)]"><span>Scope</span><span>{p.progress}%</span></div>
                      <div className="scope-bar project-status" data-status={p.status} role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} scope`}>
                        <span style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <span className="badge project-status min-w-28 justify-center" data-status={p.status}>{projectStatusLabel(p.status)}</span>
                    <a href={`/projects/${p.id}`} aria-label={`Open ${p.name}`} className="grid h-8 w-8 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]">
                      <DotsThree size={18} weight="bold" />
                    </a>
                  </div>
                ))}
                {!data.recent.length && <p className="p-8 text-center text-sm text-[var(--ink-soft)]">No projects yet.</p>}
              </div>
            </section>
            <section className="kickoff-card">
              <Lightning size={22} weight="bold" className="shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">Need a fast kickoff checklist?</h2>
                <p className="text-xs text-[var(--ink-soft)]">Generate standard discovery briefs and asset request vaults in 1 click.</p>
              </div>
              <a href="/settings/templates" className="tool-btn">Use Template</a>
            </section>
          </div>

          <aside className="grid gap-5">
            <section className="dash-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-semibold">
                  Today's Focus
                  {data.focusPending > 0 && <span className="h-2 w-2 rounded-full bg-[var(--danger)]" aria-hidden="true" />}
                </h2>
                <span className="text-xs text-[var(--ink-soft)]">{Math.max(data.focusPending - doneIds.size, 0)} pending</span>
              </div>
              <ul className="grid gap-4">
                {data.focus.map((t) => {
                  const done = doneIds.has(t.id);
                  const meta = focusMeta(t);
                  return (
                    <li key={t.id} className="flex gap-3">
                      <input type="checkbox" className="task-check mt-0.5" checked={done} disabled={done} onChange={() => void completeFocus(t)} aria-label={`Complete "${t.title}"`} />
                      <div className="min-w-0">
                        <a href={`/projects/${t.projectId}`} className={`block text-[13px] font-medium hover:underline ${done ? "text-[var(--ink-soft)] line-through" : ""}`}>{t.title}</a>
                        <p className="text-xs text-[var(--ink-soft)]">
                          {t.clientName} · <span className={meta.danger ? "font-medium text-[var(--danger)]" : "capitalize"}>{meta.text}</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
                {!data.focus.length && <li className="text-sm text-[var(--ink-soft)]">Nothing urgent today.</li>}
              </ul>
            </section>

            <section className="dash-panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Weekly Throughput</h2>
                {delta !== null && (
                  <span className={`text-xs font-semibold ${delta >= 0 ? "text-[var(--accent-text)]" : "text-[var(--danger)]"}`}>
                    {delta >= 0 ? "+" : ""}{delta}% vs last week
                  </span>
                )}
              </div>
              <svg viewBox="0 -4 300 78" className="h-20 w-full overflow-visible" role="img" aria-label={`Tasks completed per day: ${week.map((d) => d.count).join(", ")}`}>
                <path d={spark.area} className="spark-area" />
                <path d={spark.line} className="spark-line" />
                <circle cx={spark.end.x} cy={spark.end.y} r="4" className="spark-dot" />
              </svg>
              <div className="mt-2 flex justify-between text-[11px] text-[var(--ink-soft)]">
                {week.map((d, i) => (
                  <span key={d.day} className={i === 6 ? "font-semibold text-[var(--ink)]" : ""}>{weekday(d.date, i === 6)}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-xs">
                <span className="text-[var(--ink-soft)]">Completed tasks this sprint</span>
                <strong>{data.sprint.done + doneIds.size} / {data.sprint.total}</strong>
              </div>
            </section>

            <section className="dash-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Active Client Hubs</h2>
                <a href="/clients" aria-label="All clients" className="text-[var(--ink-soft)] hover:text-[var(--ink)]"><UsersThree size={18} /></a>
              </div>
              <ul className="grid gap-3">
                {data.hubs.map((h) => {
                  const badge = hubBadge(h);
                  return (
                    <li key={h.id}>
                      <a href={`/clients/${h.id}`} className="flex items-center justify-between gap-3 text-[13px] font-medium hover:underline">
                        <span className="truncate">{h.name}</span>
                        <span className="hub-pill" data-tone={badge.tone}>{badge.label}</span>
                      </a>
                    </li>
                  );
                })}
                {!data.hubs.length && <li className="text-sm text-[var(--ink-soft)]">No active clients.</li>}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </Shell>
  );
}
