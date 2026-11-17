export type ViewTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeType: string;
  assigneeName: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
};
export type SortKey = "priority" | "date";
export type TaskGroup = { projectId: string; projectName: string; tasks: ViewTask[]; done: number; total: number };

const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const assigneeOf = (t: Pick<ViewTask, "assigneeName" | "assigneeType" | "clientName">) => t.assigneeName?.trim() || (t.assigneeType === "client" ? t.clientName : "KiguDev");

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export function filterTasks(tasks: ViewTask[], status: string, query: string) {
  const q = query.trim().toLowerCase();
  return tasks.filter(
    (t) => (!status || t.status === status) && (!q || t.title.toLowerCase().includes(q) || assigneeOf(t).toLowerCase().includes(q)),
  );
}

// Open tasks first, then by priority or due date; tasks without a date sink to the bottom.
export function sortTasks(tasks: ViewTask[], key: SortKey) {
  const byDate = (a: ViewTask, b: ViewTask) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  const byPriority = (a: ViewTask, b: ViewTask) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === "completed") - Number(b.status === "completed") ||
      (key === "priority" ? byPriority(a, b) || byDate(a, b) : byDate(a, b) || byPriority(a, b)),
  );
}

// Progress uses every task in the project, not just the filtered ones, so it doesn't jump when filtering.
export function groupTasks(visible: ViewTask[], all: ViewTask[]): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const t of visible) {
    const g = groups.get(t.projectId) ?? { projectId: t.projectId, projectName: t.projectName, tasks: [], done: 0, total: 0 };
    g.tasks.push(t);
    groups.set(t.projectId, g);
  }
  for (const t of all) {
    const g = groups.get(t.projectId);
    if (!g) continue;
    g.total++;
    if (t.status === "completed") g.done++;
  }
  return [...groups.values()];
}

export function dueLabel(dueDate: string | null, today = new Date()) {
  if (!dueDate) return { text: "No date", tone: "muted" as const };
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y!, m! - 1, d!);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  if (days === 0) return { text: "Today", tone: "today" as const };
  if (days === -1) return { text: "Yesterday", tone: "overdue" as const };
  const text = due.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  return { text, tone: days < 0 ? ("overdue" as const) : ("muted" as const) };
}
