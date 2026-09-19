import {
  Briefcase,
  FolderSimple,
  House,
  ListChecks,
  SignOut,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

const links = [
  ["/dashboard", "Overview", House],
  ["/clients", "Clients", UsersThree],
  ["/projects", "Projects", FolderSimple],
  ["/tasks", "Tasks", ListChecks],
  ["/settings/templates", "Templates", SquaresFour],
] as const;
export function Shell({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return (
    <main className="min-h-screen bg-[#010A04] text-white md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen flex-col border-r border-white/10 bg-[#050f08] p-5 text-white md:fixed md:flex md:w-[248px]">
        <a
          href="/dashboard"
          className="mb-12 flex items-center gap-3 px-2 text-xl font-semibold tracking-[-.04em]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80]">
            <Briefcase size={17} />
          </span>
          KiguFlow
        </a>
        <nav className="grid gap-1">
          {links.map(([href, label, Icon]) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-[8px] border px-3 py-2.5 text-sm font-medium ${path === href || (href !== "/dashboard" && path.startsWith(href)) ? "border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]" : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/[.03] hover:text-white"}`}
            >
              <Icon size={19} />
              {label}
            </a>
          ))}
        </nav>
        <button
          onClick={async () => {
            await api("/auth/logout", { method: "POST" });
            location.href = "/login";
          }}
          className="mt-auto flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-white/40 hover:bg-white/5 hover:text-white"
        >
          <SignOut size={19} />
          Sign out
        </button>
      </aside>
      <section className="vertex-admin min-w-0 p-4 pb-24 md:col-start-2 md:p-8 lg:p-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="vertex-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#4ADE80]">
              KiguDev workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
              {title}
            </h1>
          </div>
          {action}
        </header>
        {children}
      </section>
      <nav className="fixed bottom-0 z-50 flex w-full justify-around border-t border-white/10 bg-[#050f08] p-2 text-white md:hidden">
        {links.slice(0, 4).map(([href, label, Icon]) => (
          <a
            href={href}
            aria-label={label}
            className="grid place-items-center gap-1 px-3 py-1 text-[10px]"
          >
            <Icon size={21} />
            {label}
          </a>
        ))}
      </nav>
    </main>
  );
}
