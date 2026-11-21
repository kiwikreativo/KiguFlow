import { useState, type FormEvent, type ReactNode } from "react";
import { api, isAuthenticationError } from "@/lib/api";
import { Modal } from "./Modal";
import type { Task } from "./tasksView";

type Props = {
  task: Task;
  phases: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDelete?: (task: Task) => void;
  extraAction?: ReactNode;
};

export function TaskModal({ task, phases, onClose, onSaved, onDelete, extraAction }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (name: string) => String(f.get(name) ?? "").trim() || null;
    const next: Partial<Task> = {
      title: text("title") ?? "",
      description: text("description"),
      phaseId: text("phaseId"),
      status: String(f.get("status")),
      priority: String(f.get("priority")),
      assigneeType: String(f.get("assigneeType")),
      assigneeName: text("assigneeName"),
      dueDate: text("dueDate"),
      clientVisible: f.get("clientVisible") === "on",
      requiresClientAction: f.get("requiresClientAction") === "on",
    };
    // Send only what changed, so a stale modal can't overwrite other edits.
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => task[key as keyof Task] !== value));
    if (!Object.keys(patch).length) return onClose();
    setSaving(true);
    setError("");
    try {
      onSaved(await api<Task>(`/admin/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(patch) }));
    } catch (x) {
      if (isAuthenticationError(x)) location.href = "/login";
      else setError(x instanceof Error ? x.message : "Could not save the task");
      setSaving(false);
    }
  }

  return (
    <Modal title={task.title} onClose={() => !saving && onClose()}>
      <form onSubmit={save} className="grid gap-4">
        <label className="label">
          Task name
          <input name="title" className="field" required maxLength={240} defaultValue={task.title} />
        </label>
        <label className="label">
          Description
          <textarea name="description" className="field min-h-36" maxLength={5000} defaultValue={task.description ?? ""} placeholder="No description yet" />
        </label>
        <label className="label">
          Phase
          <select name="phaseId" className="field" defaultValue={task.phaseId ?? ""}>
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            Status
            <select name="status" className="field" defaultValue={task.status}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="waiting_for_client">Waiting for client</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="label">
            Priority
            <select name="priority" className="field" defaultValue={task.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="label">
            Assigned to
            <select name="assigneeType" className="field" defaultValue={task.assigneeType}>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
            </select>
          </label>
          <label className="label">
            Assignee name
            <input name="assigneeName" maxLength={120} className="field" placeholder="e.g. Joss Segura" defaultValue={task.assigneeName ?? ""} />
          </label>
          <label className="label">
            Due date
            <input type="date" name="dueDate" className="field" defaultValue={task.dueDate ?? ""} />
          </label>
        </div>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="clientVisible" defaultChecked={task.clientVisible} />
          Visible to client
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="requiresClientAction" defaultChecked={task.requiresClientAction} />
          Requires client action
        </label>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
          {onDelete && (
            <button type="button" className="mr-auto text-sm font-semibold text-red-400 hover:text-red-300" disabled={saving} onClick={() => onDelete(task)}>
              Delete task
            </button>
          )}
          {extraAction}
          <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
