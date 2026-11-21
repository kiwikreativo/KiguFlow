import {
  CaretDown,
  FolderSimple,
  House,
  ListChecks,
  SignOut,
  SquaresFour,
  Stack,
  Storefront,
  UserList,
  UserPlus,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoLight from "@/assets/logos/kfverde.webp";
import logoDark from "@/assets/logos/kiguFlowblanco.webp";

type NavLink = readonly [href: string, label: string, Icon: PhosphorIcon];
type NavItem = { label: string; Icon: PhosphorIcon; href?: string; children?: readonly NavLink[] };
const nav: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: SquaresFour },
  {
    label: "Business Hub",
    Icon: Storefront,
    children: [
      ["/projects", "Projects", FolderSimple],
      ["/tasks", "Tasks", ListChecks],
      ["/settings/templates", "Templates", Stack],
    ],
  },
  { href: "/clients", label: "Clients", Icon: UserList, children: [["/clients?new=1", "Add client", UserPlus]] },
];
const mobileLinks: readonly NavLink[] = [
  ["/dashboard", "Overview", House],
  ["/clients", "Clients", UsersThree],
  ["/projects", "Projects", FolderSimple],
  ["/tasks", "Tasks", ListChecks],
];
const itemClass = (active: boolean) => `side-item${active ? " is-active" : ""}`;
export function Shell({
  children,
  title,
  action,
  header,
  taskCount,
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
  /** Replaces the default title header. */
  header?: ReactNode;
  /** shortcut: badge only shows where the page passes it; add a counts endpoint to show it everywhere. */
  taskCount?: number;
}) {
  // Path and open groups are set after mount: the server has no window, so reading it during render breaks hydration.
  const [path, setPath] = useState("");
  const matches = (p: string, href: string) => p === href || (href !== "/dashboard" && p.startsWith(href));
  const isActive = (href: string) => matches(path, href);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  useEffect(() => {
    const p = location.pathname;
    setPath(p);
    setOpenGroups(nav.filter((item) => (item.href && item.href !== "/dashboard" && matches(p, item.href)) || item.children?.some(([href]) => matches(p, href))).map((item) => item.label));
  }, []);
  const toggle = (label: string) =>
    setOpenGroups((groups) => (groups.includes(label) ? groups.filter((g) => g !== label) : [...groups, label]));
  useEffect(() => {
    const timeoutMs = 10 * 60 * 1000;
    let timeout = 0;
    let lastTouch = 0;
    const expire = async () => {
      try { await api('/auth/logout', { method: 'POST' }); } finally {
        location.href = '/login?reason=inactive';
      }
    };
    const activity = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(expire, timeoutMs);
      const now = Date.now();
      if (now - lastTouch > 60_000) {
        lastTouch = now;
        void api('/admin/session/activity', { method: 'POST' }).catch(() => undefined);
      }
    };
    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'touchstart', 'pointerdown', 'input', 'popstate'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    activity();
    return () => { window.clearTimeout(timeout); events.forEach((event) => window.removeEventListener(event, activity)); };
  }, []);
  return (
    <main className="app-shell min-h-screen bg-[#010A04] text-white md:grid md:grid-cols-[248px_1fr]">
      <aside className="side-bar hidden min-h-screen flex-col md:fixed md:flex md:w-[248px]">
        <a href="/dashboard" className="side-brand">
          <img src={logoDark.src} alt="" className="logo-dark h-8 w-8 flex-none" />
          <img src={logoLight.src} alt="" className="logo-light h-8 w-8 flex-none" />
          <span className="grid leading-tight">
            <strong className="text-[15px] font-semibold tracking-[-.02em]">KiguFlow</strong>
            <span className="text-[11px] text-[var(--ink-soft)]">Workspace</span>
          </span>
        </a>
        <nav className="grid gap-1 p-3">
          {nav.map(({ href, label, Icon, children }) => {
            if (!children)
              return (
                <a key={label} href={href} className={itemClass(isActive(href!))} aria-current={isActive(href!) ? "page" : undefined}>
                  <Icon size={19} />
                  {label}
                </a>
              );
            const open = openGroups.includes(label);
            const caret = <CaretDown size={14} weight="fill" className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />;
            return (
              <div key={label} className="grid gap-1">
                {href ? (
                  <div className="relative">
                    <a href={href} className={`${itemClass(isActive(href))} pr-10`}>
                      <Icon size={19} />
                      {label}
                    </a>
                    <button
                      type="button"
                      aria-label={`Toggle ${label}`}
                      aria-expanded={open}
                      onClick={() => toggle(label)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    >
                      {caret}
                    </button>
                  </div>
                ) : (
                  <button type="button" aria-expanded={open} onClick={() => toggle(label)} className={`${itemClass(false)} w-full text-left`}>
                    <Icon size={19} />
                    {label}
                    {caret}
                  </button>
                )}
                {open && (
                  <div className="grid gap-1">
                    {children.map(([childHref, childLabel, ChildIcon]) => {
                      // Query-string links are actions (e.g. Add client), never highlighted.
                      const active = !childHref.includes("?") && isActive(childHref);
                      return (
                        <a key={childHref} href={childHref} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                          <ChildIcon size={19} />
                          {childLabel}
                          {childHref === "/tasks" && taskCount !== undefined && <span className="side-badge">{taskCount}</span>}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="side-foot mt-auto grid gap-3">
          <ThemeToggle className="w-fit" />
          <button
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              location.href = "/login";
            }}
            className="side-item"
          >
            <SignOut size={19} />
            Sign out
          </button>
        </div>
      </aside>
      <section className="vertex-admin min-w-0 p-4 pb-24 md:col-start-2 md:p-8 lg:p-10">
        {header ?? <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="vertex-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#4ADE80]">
              KiguDev workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="admin-header-theme" />
            {action}
          </div>
        </header>}
        {children}
      </section>
      <nav className="fixed bottom-0 z-50 flex w-full justify-around border-t border-white/10 bg-[#050f08] p-2 text-white md:hidden">
        {mobileLinks.map(([href, label, Icon]) => (
          <a
            key={href}
            href={href}
            aria-label={label}
            className="grid place-items-center gap-1 px-3 py-1 text-[10px]"
          >
            <Icon size={21} weight="fill" />
            {label}
          </a>
        ))}
        <ThemeToggle className="mobile-theme-toggle" />
      </nav>
    </main>
  );
}
