import { describe, expect, it } from "vitest";
import { assigneeOf, dueLabel, filterTasks, groupTasks, initials, sortTasks, type ViewTask } from "./tasksView";

const t = (over: Partial<ViewTask>): ViewTask => ({
  id: "1", title: "Task", status: "todo", priority: "medium", dueDate: null, assigneeType: "admin",
  assigneeName: null, projectId: "p1", projectName: "P1", clientName: "Acme Co", ...over,
});

describe("tasksView", () => {
  it("falls back to client name or KiguDev for the assignee", () => {
    expect(assigneeOf(t({ assigneeName: "Joss Segura" }))).toBe("Joss Segura");
    expect(assigneeOf(t({ assigneeType: "client" }))).toBe("Acme Co");
    expect(assigneeOf(t({ assigneeName: "  " }))).toBe("KiguDev");
    expect(initials("Kattia Altamirano Ruiz")).toBe("KA");
    expect(initials("")).toBe("?");
  });

  it("filters by status and by title or assignee", () => {
    const rows = [t({ id: "a", title: "Deploy site" }), t({ id: "b", status: "completed", assigneeName: "Joss" })];
    expect(filterTasks(rows, "completed", "").map((r) => r.id)).toEqual(["b"]);
    expect(filterTasks(rows, "", "joss").map((r) => r.id)).toEqual(["b"]);
    expect(filterTasks(rows, "", "DEPLOY").map((r) => r.id)).toEqual(["a"]);
  });

  it("sorts open before completed, then by priority or date", () => {
    const rows = [
      t({ id: "done", status: "completed", priority: "urgent" }),
      t({ id: "low", priority: "low", dueDate: "2026-01-01" }),
      t({ id: "urgent", priority: "urgent", dueDate: "2026-03-01" }),
      t({ id: "nodate", priority: "high" }),
    ];
    expect(sortTasks(rows, "priority").map((r) => r.id)).toEqual(["urgent", "nodate", "low", "done"]);
    expect(sortTasks(rows, "date").map((r) => r.id)).toEqual(["low", "urgent", "nodate", "done"]);
  });

  it("groups visible tasks with progress from all tasks", () => {
    const all = [t({ id: "a" }), t({ id: "b", status: "completed" }), t({ id: "c", projectId: "p2" })];
    const groups = groupTasks([all[0]!], all);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ projectId: "p1", done: 1, total: 2 });
  });

  it("labels due dates relative to today", () => {
    const today = new Date(2026, 5, 12);
    expect(dueLabel("2026-06-12", today)).toEqual({ text: "Today", tone: "today" });
    expect(dueLabel("2026-06-11", today)).toEqual({ text: "Yesterday", tone: "overdue" });
    expect(dueLabel("2026-06-20", today)).toEqual({ text: "Jun 20", tone: "muted" });
    expect(dueLabel(null, today).tone).toBe("muted");
  });
});
