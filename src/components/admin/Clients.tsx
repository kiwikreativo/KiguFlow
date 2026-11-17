import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Archive, Eye, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api, isAbortError, isAuthenticationError } from "@/lib/api";
import { Shell } from "./Shell";
import { Modal } from "./Modal";
import { pageList } from "./pagination";
type Client = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  status: string;
  createdAt: string;
};
type Status = "active" | "lead" | "inactive" | "all";
type Range = "month" | "30d" | "year" | "all";
type View = "active" | "new" | "followup";
const PAGE_SIZE = 10;
// Reuses the project-status palette: lead → amber, inactive → gray, active → default green.
const statusTone: Record<string, string | undefined> = { lead: "waiting_for_client", inactive: "archived" };
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const rangeStart = (range: Range) => {
  const now = new Date();
  if (range === "month") return monthStart();
  if (range === "30d") return new Date(now.getTime() - 30 * 864e5);
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
};
const views: [View, string, (c: Client) => boolean][] = [
  ["active", "All Active", (c) => c.status === "active"],
  ["new", "New This Month", (c) => new Date(c.createdAt) >= monthStart()],
  ["followup", "Needs Follow-up", (c) => c.status === "lead" || c.status === "inactive"],
];
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const pill = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${active ? "border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]" : "border-white/10 text-white/45 hover:text-white"}`;
const iconButton = "grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-[#4ADE80]/10 hover:text-[#4ADE80]";

export function Clients() {
  const [rows, setRows] = useState<Client[]>([]),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState<Status>("active"),
    // "all" by default: a current-month default hid every older client.
    [range, setRange] = useState<Range>("all"),
    [view, setView] = useState<View | null>(null),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  // shortcut: loads every non-archived client and filters in the browser; move search/filters/paging server-side if the list grows to thousands.
  const load = (signal?: AbortSignal) => api<Client[]>("/admin/clients", { signal }).then(setRows);
  useEffect(() => {
    // Sidebar "Add client" links to /clients?new=1
    if (!new URLSearchParams(location.search).has("new")) return;
    setOpen(true);
    history.replaceState(null, "", location.pathname);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((error) => {
      if (isAbortError(error)) return;
      if (isAuthenticationError(error)) location.href = "/login";
      else toast.error(error instanceof Error ? error.message : "Could not load clients");
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setPage(1), [search, status, range, view]);

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => [r.name, r.companyName ?? "", r.email].some((v) => v.toLowerCase().includes(q))) : rows;
  }, [rows, search]);
  // Toolbar filters first; views narrow further, so view counts always match what the table can show.
  const base = useMemo(() => {
    const from = rangeStart(range);
    return matched.filter((r) => (status === "all" || r.status === status) && (!from || new Date(r.createdAt) >= from));
  }, [matched, status, range]);
  const filtered = useMemo(() => {
    const viewTest = views.find(([key]) => key === view)?.[2];
    return viewTest ? base.filter(viewTest) : base;
  }, [base, view]);
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const chooseView = (key: View) => {
    setView((v) => (v === key ? null : key));
    // Views need every status; the Status filter would otherwise empty "Needs Follow-up".
    setStatus("all");
  };
  const reset = () => {
    setSearch("");
    setStatus("active");
    setRange("all");
    setView(null);
  };
  const toggleRow = (id: string) =>
    setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const togglePage = () =>
    setSelected((s) => { const next = new Set(s); pageRows.forEach((r) => (allOnPage ? next.delete(r.id) : next.add(r.id))); return next; });

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          companyName: f.get("companyName") || null,
          email: f.get("email"),
          phone: f.get("phone") || null,
          preferredLanguage: f.get("preferredLanguage"),
          status: "active",
        }),
      });
      setOpen(false);
      toast.success("Client created");
      await load();
    } catch (x) {
      toast.error(x instanceof Error ? x.message : "Could not create client");
    }
  }
  async function archive(id: string) {
    if (
      !confirm(
        "Archive this client? Their project history will remain available.",
      )
    )
      return;
    await api(`/admin/clients/${id}/archive`, { method: "POST" });
    toast.success("Client archived");
    setSelected((s) => { const next = new Set(s); next.delete(id); return next; });
    await load();
  }
  return (
    <Shell
      title="Clients"
      action={
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus />
          New client
        </button>
      }
    >
      <Toaster richColors />
      <div className="surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <label className="relative block min-w-[220px] flex-1">
          <span className="sr-only">Search clients</span>
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737a76]" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field field-search pr-20"
            placeholder="Search name, company, or email"
          />
          <kbd className="vertex-mono pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/45">
            Press /
          </kbd>
        </label>
        <label className="w-full sm:w-40">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value as Status); setView(null); }} className="field">
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Date range</span>
          <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="field">
            <option value="month">This month</option>
            <option value="30d">Last 30 days</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </label>
        <button type="button" onClick={reset} className="px-2 text-sm font-medium text-white/45 hover:text-white">
          Reset
        </button>
      </div>

      <div className="my-5 flex flex-wrap gap-2" role="tablist" aria-label="Client views">
        {views.map(([key, label, test]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => chooseView(key)} className={pill(view === key)}>
            {label}
            <span className="vertex-mono text-xs opacity-70">{base.filter(test).length}</span>
          </button>
        ))}
      </div>

      <div className="surface rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-[#7c827f]">
              <tr>
                <th className="w-12 p-4">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={togglePage} className="accent-[#4ADE80]" />
                </th>
                <th className="py-4">Client &amp; company</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e0d8]">
              {pageRows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[#4ADE80]/[.04]">
                  <td className="p-4">
                    <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} className="accent-[#4ADE80]" />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[#4ADE80]/25 bg-[#4ADE80]/10 text-xs font-semibold text-[#4ADE80]">
                        {initials(r.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold">
                          {r.name}
                          {r.status === "active" && <span className="h-2 w-2 rounded-full bg-[#4ADE80]" aria-label="Active" />}
                        </span>
                        <span className="block text-white/45">{r.companyName || "Independent"}</span>
                      </span>
                    </div>
                  </td>
                  <td className="vertex-mono text-xs">{r.email}</td>
                  <td>
                    <span className="badge project-status gap-1.5" data-status={statusTone[r.status]}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="pr-4">
                    <div className="flex justify-end gap-1">
                      <a href={`/clients/${r.id}`} aria-label={`View ${r.name}`} title="View client" className={iconButton}>
                        <Eye size={17} />
                      </a>
                      <button onClick={() => archive(r.id)} aria-label={`Archive ${r.name}`} title="Archive client" className={iconButton}>
                        <Archive size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={6} className="p-14 text-center text-[#767d79]">
                    No clients match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4 text-sm text-white/45">
          <p>
            {filtered.length
              ? `Showing ${(current - 1) * PAGE_SIZE + 1} to ${(current - 1) * PAGE_SIZE + pageRows.length} of ${filtered.length} entries`
              : "Showing 0 of 0 entries"}
            {selected.size > 0 && <span className="ml-3 text-[#4ADE80]">{selected.size} selected</span>}
          </p>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded-lg px-3 py-1.5 hover:text-white disabled:opacity-40 disabled:hover:text-inherit">
              Previous
            </button>
            {pageList(current, lastPage).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-2">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-current={p === current ? "page" : undefined}
                  onClick={() => setPage(p)}
                  className={`min-w-8 rounded-lg border px-2.5 py-1.5 ${p === current ? "border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]" : "border-transparent hover:text-white"}`}
                >
                  {p}
                </button>
              ),
            )}
            <button type="button" disabled={current === lastPage} onClick={() => setPage(current + 1)} className="rounded-lg px-3 py-1.5 hover:text-white disabled:opacity-40 disabled:hover:text-inherit">
              Next
            </button>
          </nav>
        </div>
      </div>
      {open && (
        <Modal title="Create a client" onClose={() => setOpen(false)}>
          <form onSubmit={create} className="grid gap-4">
            <label className="label">
              Name
              <input name="name" required minLength={2} className="field" />
            </label>
            <label className="label">
              Company
              <input name="companyName" className="field" />
            </label>
            <label className="label">
              Email
              <input name="email" type="email" required className="field" />
            </label>
            <label className="label">
              Phone
              <input name="phone" className="field" />
            </label>
            <label className="label">
              Preferred language
              <select name="preferredLanguage" className="field" defaultValue="en" required>
                <option value="en">English</option>
                <option value="es">Spanish</option>
              </select>
            </label>
            <button className="btn-primary mt-3 w-full py-3.5">Create client</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
