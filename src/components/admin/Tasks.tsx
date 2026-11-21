import {
  ArrowsDownUp,
  ArrowsInLineVertical,
  ArrowsOutLineVertical,
  CaretDoubleUp,
  CaretDown,
  CheckCircle,
  Circle,
  Clock,
  DotsThree,
  Hourglass,
  ImageSquare,
  Lightning,
  ListBullets,
  MagnifyingGlass,
  Plus,
  Rows,
  SquaresFour,
  TrendUp,
  Warning,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, isAbortError, isAuthenticationError } from "@/lib/api";
import { TaskModal } from "./TaskModal";
import { Shell } from "./Shell";
import {
  assigneeOf,
  dueLabel,
  filterTasks,
  groupTasks,
  initials,
  sortTasks,
  type SortKey,
  type Task,
  type ViewTask,
} from "./tasksView";

const statuses = [
  { value: "", label: "All Tasks", tone: "all" },
  { value: "todo", label: "To do", tone: "todo" },
  { value: "in_progress", label: "In progress", tone: "progress" },
  { value: "waiting_for_client", label: "Waiting for client", tone: "waiting" },
  { value: "review", label: "Review", tone: "review" },
  { value: "completed", label: "Completed", tone: "completed" },
] as const;

const statusMeta: Record<string, { label: string; Icon: PhosphorIcon }> = {
  todo: { label: "To do", Icon: Circle },
  in_progress: { label: "In progress", Icon: Lightning },
  blocked: { label: "Blocked", Icon: Warning },
  waiting_for_client: { label: "Waiting for Client", Icon: Clock },
  review: { label: "Review", Icon: Hourglass },
  completed: { label: "Completed", Icon: CheckCircle },
};
const priorityBars: Record<string, number> = { low: 1, medium: 2, high: 3 };
const isCritical = (t: Pick<ViewTask, "priority" | "status">) => t.priority === "urgent" && t.status !== "completed";
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

function StatusPill({ task }: { task: ViewTask }) {
  if (isCritical(task))
    return (
      <span className="tstat" data-status="critical">
        <Warning size={13} weight="bold" aria-hidden="true" /> Critical
      </span>
    );
  const meta = statusMeta[task.status] ?? { label: task.status.replaceAll("_", " "), Icon: Circle };
  return (
    <span className="tstat" data-status={task.status}>
      <meta.Icon size={13} weight="bold" aria-hidden="true" /> {meta.label}
    </span>
  );
}

export function PriorityDate({ task }: { task: Pick<ViewTask, "priority" | "status" | "dueDate"> }) {
  if (isCritical(task))
    return (
      <span className="tdue" data-tone="critical">
        <CaretDoubleUp size={14} weight="bold" aria-label="Urgent priority" /> ASAP
      </span>
    );
  const due = dueLabel(task.dueDate);
  const bars = priorityBars[task.priority] ?? 2;
  return (
    <span className="tdue" data-tone={task.status === "completed" ? "muted" : due.tone}>
      <span className="prio-bars" aria-label={`${task.priority} priority`} title={`${task.priority} priority`}>
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= bars ? "on" : ""} />
        ))}
      </span>
      {due.text}
    </span>
  );
}

export function Tasks() {
  const [rows, setRows] = useState<ViewTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("priority");
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [inspect, setInspect] = useState<{ task: Task; projectId: string; phases: Array<{ id: string; name: string }> } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dashboard search links to /tasks?q=…
    const q = new URLSearchParams(location.search).get("q");
    if (q) setQuery(q);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<ViewTask[]>("/admin/tasks", { signal: controller.signal })
      .then((data) => {
        setRows(data);
        setLoaded(true);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        if (isAuthenticationError(error)) location.href = "/login";
        else setLoadError(error instanceof Error ? error.message : "Could not load tasks");
      });
    return () => controller.abort();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": rows.length };
    for (const t of rows) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const visible = useMemo(() => sortTasks(filterTasks(rows, status, query), sort), [rows, status, query, sort]);
  const groups = useMemo(() => groupTasks(visible, rows), [visible, rows]);
  // Row order the keyboard walks: what's on screen, skipping collapsed groups.
  const navOrder = useMemo(
    () => (grouped ? groups.filter((g) => !collapsed.has(g.projectId)).flatMap((g) => g.tasks) : visible),
    [grouped, groups, collapsed, visible],
  );
  const activeCount = rows.filter((t) => t.status !== "completed").length;
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.projectId));

  async function toggleDone(task: ViewTask) {
    const next = task.status === "completed" ? "todo" : "completed";
    const setStatusOf = (value: string) =>
      setRows((current) => current.map((t) => (t.id === task.id ? { ...t, status: value } : t)));
    setStatusOf(next);
    setLoadError("");
    try {
      await api(`/admin/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    } catch (error) {
      setStatusOf(task.status);
      if (isAuthenticationError(error)) location.href = "/login";
      else setLoadError(error instanceof Error ? error.message : "Could not update task");
    }
  }

  // The list row is slim; the project endpoint has the full task (description, flags) and its phases.
  async function openTask(task: ViewTask) {
    try {
      const project = await api<{ tasks: Task[]; phases: Array<{ id: string; name: string }> }>(`/admin/projects/${task.projectId}`);
      const full = project.tasks.find((t) => t.id === task.id);
      if (full) setInspect({ task: full, projectId: task.projectId, phases: project.phases });
      else setLoadError("This task no longer exists.");
    } catch (error) {
      if (isAuthenticationError(error)) location.href = "/login";
      else setLoadError(error instanceof Error ? error.message : "Could not open task");
    }
  }

  function taskSaved(task: Task) {
    const { title, status, priority, dueDate, assigneeType, assigneeName } = task;
    setRows((current) => current.map((t) => (t.id === task.id ? { ...t, title, status, priority, dueDate, assigneeType, assigneeName } : t)));
    setInspect(null);
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      await api(`/admin/tasks/${task.id}`, { method: "DELETE" });
      setRows((current) => current.filter((t) => t.id !== task.id));
      setInspect(null);
    } catch (error) {
      if (isAuthenticationError(error)) location.href = "/login";
      else setLoadError(error instanceof Error ? error.message : "Could not delete task");
    }
  }

  // Latest state for the keydown listener without re-binding it every render.
  const keyState = useRef({ navOrder, focusId, inspect, toggleDone, openTask });
  keyState.current = { navOrder, focusId, inspect, toggleDone, openTask };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { navOrder, focusId, inspect, toggleDone, openTask } = keyState.current;
      const target = event.target as HTMLElement;
      if (inspect || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      const index = navOrder.findIndex((t) => t.id === focusId);
      if (key === "j" || key === "k") {
        event.preventDefault();
        const next = navOrder[key === "j" ? Math.min(index + 1, navOrder.length - 1) : Math.max(index - 1, 0)];
        if (next) {
          setFocusId(next.id);
          listRef.current?.querySelector(`[data-task-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
        }
      } else if (key === "x" && index >= 0) {
        event.preventDefault();
        void toggleDone(navOrder[index]!);
      } else if (event.key === " " && index >= 0 && !target.closest("button, a")) {
        event.preventDefault();
        void openTask(navOrder[index]!);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleGroup = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stats = [
    { label: "Total Tasks", value: rows.length, sub: `${rows.length ? 100 : 0}% indexed`, SubIcon: TrendUp, Icon: SquaresFour, tone: "neutral" },
    { label: "In Progress / Active", value: counts.in_progress ?? 0, sub: `${pct(counts.in_progress ?? 0, rows.length)}% of volume`, SubIcon: Lightning, Icon: Hourglass, tone: "progress" },
    { label: "Waiting on Client", value: counts.waiting_for_client ?? 0, sub: "Pending approval", SubIcon: Clock, Icon: ImageSquare, tone: "waiting" },
    { label: "Completed Work", value: counts.completed ?? 0, sub: `${pct(counts.completed ?? 0, rows.length)}% execution`, SubIcon: CheckCircle, Icon: CheckCircle, tone: "completed" },
  ] as const;

  const row = (t: ViewTask) => {
    const name = assigneeOf(t);
    const done = t.status === "completed";
    return (
      <div
        key={t.id}
        data-task-id={t.id}
        className={`task-row${isCritical(t) ? " is-critical" : ""}${focusId === t.id ? " is-focused" : ""}`}
        onClick={() => setFocusId(t.id)}
      >
        <input
          type="checkbox"
          className="task-check"
          checked={done}
          onChange={() => void toggleDone(t)}
          aria-label={`Mark "${t.title}" as ${done ? "to do" : "completed"}`}
        />
        <button type="button" className={`task-title${done ? " is-done" : ""}`} onClick={() => void openTask(t)}>
          {isCritical(t) && <span aria-hidden="true" className="mr-1.5 font-bold">!</span>}
          {t.title}
        </button>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--ink-soft)]">
          <span className="task-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="truncate">{name}</span>
        </span>
        <span><StatusPill task={t} /></span>
        <span className="md:justify-self-end"><PriorityDate task={t} /></span>
      </div>
    );
  };

  const tableHead = (
    <div className="task-head" aria-hidden="true">
      <span />
      <span>Task title</span>
      <span>Assignee</span>
      <span>Status</span>
      <span className="md:justify-self-end">Priority &amp; date</span>
    </div>
  );

  const header = (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ws-chip">Active workspace</span>
        <span className="text-[var(--ink-faint)]" aria-hidden="true">/</span>
        <h1 className="text-xl font-semibold tracking-[-.03em] md:text-2xl">Production Workstreams</h1>
        <span className="count-pill">{activeCount} tasks active</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={grouped} onClick={() => setGrouped(true)}>
            <Rows size={15} aria-hidden="true" /> Grouped
          </button>
          <button type="button" aria-pressed={!grouped} onClick={() => setGrouped(false)}>
            <ListBullets size={15} aria-hidden="true" /> Flat
          </button>
        </div>
        {grouped && (
          <button
            type="button"
            className="tool-btn"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.projectId)))}
          >
            {allCollapsed ? <ArrowsOutLineVertical size={15} aria-hidden="true" /> : <ArrowsInLineVertical size={15} aria-hidden="true" />}
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        )}
      </div>
    </header>
  );

  return (
    <Shell title="Tasks" header={header} taskCount={rows.length}>
      {loadError && <div className="surface mb-5 rounded-2xl p-5 text-red-500" role="alert">{loadError}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, sub, SubIcon, Icon, tone }) => (
          <div key={label} className="stat-card" data-tone={tone}>
            <div>
              <p className="text-[13px] text-[var(--ink-soft)]">{label}</p>
              <p className="stat-value">{value}</p>
              <p className="stat-sub"><SubIcon size={13} weight="bold" aria-hidden="true" /> {sub}</p>
            </div>
            <span className="stat-icon" aria-hidden="true"><Icon size={20} weight="bold" /></span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter tasks by status">
        {statuses.map(({ value, label, tone }) => (
          <button
            key={tone}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={`task-filter task-filter-${tone} ${status === value ? "is-active" : ""}`}
          >
            {label}
            <span className="filter-count">{counts[value] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <label className="search-box">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tasks by name or assignee"
            aria-label="Filter tasks by name or assignee"
          />
          {query && (
            <button type="button" aria-label="Clear filter" onClick={() => setQuery("")}>
              <X size={13} />
            </button>
          )}
        </label>
        <button type="button" className="tool-btn" onClick={() => setSort(sort === "priority" ? "date" : "priority")}>
          <ArrowsDownUp size={15} aria-hidden="true" /> Sort: {sort === "priority" ? "Priority" : "Date"}
        </button>
      </div>

      <div ref={listRef} className="grid gap-5">
        {grouped
          ? groups.map((g) => {
              const open = !collapsed.has(g.projectId);
              const progress = Math.round(pct(g.done, g.total));
              return (
                <section key={g.projectId} className="task-group" aria-label={g.projectName}>
                  <div className="task-group-head">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-label={`${open ? "Collapse" : "Expand"} ${g.projectName}`}
                      onClick={() => toggleGroup(g.projectId)}
                      className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]"
                    >
                      <CaretDown size={14} weight="bold" className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                    </button>
                    <span className="group-tile" aria-hidden="true">{initials(g.projectName)}</span>
                    <strong className="truncate text-[15px] font-semibold">{g.projectName}</strong>
                    <span className="count-pill">{g.total} tasks</span>
                    <span className="hidden items-center gap-3 sm:flex">
                      <span className="group-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.projectName} progress`}>
                        <span style={{ width: `${progress}%` }} />
                      </span>
                      <span className="text-xs text-[var(--ink-soft)]">{progress}% complete</span>
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <a href={`/projects/${g.projectId}`} className="add-task-btn">
                        <span className="add-task-dot" aria-hidden="true"><Plus size={10} weight="bold" /></span>
                        Add Task
                      </a>
                      <a href={`/projects/${g.projectId}`} aria-label={`Open ${g.projectName}`} className="grid h-8 w-8 place-items-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]">
                        <DotsThree size={18} weight="bold" />
                      </a>
                    </span>
                  </div>
                  {open && (
                    <div className="task-table">
                      {tableHead}
                      {g.tasks.map(row)}
                    </div>
                  )}
                </section>
              );
            })
          : visible.length > 0 && (
              <section className="task-group">
                <div className="task-table">
                  {tableHead}
                  {visible.map(row)}
                </div>
              </section>
            )}
        {loaded && !visible.length && (
          <p className="task-group p-8 text-center text-sm text-[var(--ink-soft)]">No tasks match these filters.</p>
        )}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--lime)]" aria-hidden="true" />
          <span>
            Synced: <strong className="font-semibold text-[var(--ink)]">{visible.length} tasks rendered across {groups.length} workstreams</strong>
          </span>
        </p>
        <p className="hidden flex-wrap items-center gap-3 md:flex">
          <span><kbd className="kbd">Space</kbd> quick inspect</span>
          <span><kbd className="kbd">X</kbd> toggle done</span>
          <span><kbd className="kbd">J/K</kbd> navigate</span>
        </p>
      </footer>

      {inspect && (
        <TaskModal
          task={inspect.task}
          phases={inspect.phases}
          onClose={() => setInspect(null)}
          onSaved={taskSaved}
          onDelete={deleteTask}
          extraAction={<a href={`/projects/${inspect.projectId}`} className="btn-secondary">Open project</a>}
        />
      )}
    </Shell>
  );
}
