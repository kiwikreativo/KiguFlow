import { useEffect, useState, type FormEvent } from "react";
import { Archive, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { toast, Toaster } from "sonner";
import { api } from "@/lib/api";
import { Shell } from "./Shell";
import { Modal } from "./Modal";
type Client = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  status: string;
  createdAt: string;
};
export function Clients() {
  const [rows, setRows] = useState<Client[]>([]),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const load = () =>
    api<Client[]>(`/admin/clients?search=${encodeURIComponent(search)}`)
      .then(setRows)
      .catch(() => (location.href = "/login"));
  useEffect(() => {
    void load();
  }, [search]);
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
          status: "active",
        }),
      });
      setOpen(false);
      toast.success("Client created");
      load();
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
    load();
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
      <div className="surface rounded-2xl">
        <div className="border-b border-[#dddbd3] p-4">
          <label className="relative block max-w-md">
            <span className="sr-only">Search clients</span>
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737a76]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field pl-10"
              placeholder="Search name, company, or email"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-[#7c827f]">
              <tr>
                <th className="p-4">Client</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e0d8]">
              {rows.map((r) => (
                <tr>
                  <td className="p-4">
                    <a href={`/clients/${r.id}`} className="block hover:text-[#4ADE80]"><strong className="block">{r.name}</strong>
                    <span className="text-[#777]">
                      {r.companyName || "Independent"}
                    </span></a>
                  </td>
                  <td>{r.email}</td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="pr-4 text-right">
                    <button
                      onClick={() => archive(r.id)}
                      title="Archive client"
                      className="rounded-lg p-2 hover:bg-black/5"
                    >
                      <Archive />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="p-14 text-center text-[#767d79]">
                    No clients match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            <button className="btn-primary mt-3 w-full py-3.5">Create client</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
