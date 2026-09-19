import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CirclesFour,
  Lightning,
  LockKey,
  Stack,
  TrendUp,
} from "@phosphor-icons/react";
import { useRef } from "react";
gsap.registerPlugin(ScrollTrigger, useGSAP);

const systems = [
  {
    icon: Stack,
    title: "Project structure",
    copy: "Turn every engagement into a clear sequence of phases, tasks, and decisions.",
    code: "PLAN / BUILD / SHIP",
  },
  {
    icon: LockKey,
    title: "Private client access",
    copy: "Give each client a focused view without exposing internal work or another project.",
    code: "SCOPED BY DEFAULT",
  },
  {
    icon: TrendUp,
    title: "Progress from reality",
    copy: "Progress is calculated from persisted work, never a number typed by hand.",
    code: "LIVE PROJECT STATE",
  },
];

export function Landing() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        yPercent: 115,
        duration: 1.1,
        stagger: 0.08,
        ease: "power4.out",
      });
      gsap.from("[data-hero-copy]", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        delay: 0.55,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.to("[data-orbit]", {
        rotate: 360,
        duration: 28,
        repeat: -1,
        ease: "none",
      });
      gsap.utils
        .toArray<HTMLElement>("[data-scale]")
        .forEach((item) =>
          gsap.fromTo(
            item,
            { scale: 0.8, opacity: 0.2 },
            {
              scale: 1,
              opacity: 1,
              scrollTrigger: {
                trigger: item,
                start: "top 90%",
                end: "center 48%",
                scrub: true,
              },
            },
          ),
        );
      gsap.utils
        .toArray<HTMLElement>("[data-stack]")
        .forEach((card, index) =>
          gsap.to(card, {
            y: index * -18,
            scrollTrigger: {
              trigger: card,
              start: "top 78%",
              end: "top 20%",
              scrub: true,
            },
          }),
        );
    },
    { scope: root },
  );
  return (
    <main
      ref={root}
      className="vertex-page w-full max-w-full overflow-x-hidden bg-[#010A04] text-white"
    >
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#010A04]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 lg:px-10">
          <a
            href="/"
            className="flex items-center gap-3 font-semibold tracking-[-.03em]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#4ADE80]/45 bg-[#4ADE80]/10">
              <CirclesFour className="text-[#4ADE80]" size={18} />
            </span>
            KiguFlow
          </a>
          <div className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <a href="#system">System</a>
            <a href="#workflow">Workflow</a>
            <a href="#control">Control</a>
          </div>
          <a
            href="/login"
            className="vertex-button group flex items-center gap-3 rounded-[8px] bg-[#4ADE80] px-4 py-2.5 text-sm font-semibold text-[#010A04]"
          >
            Open workspace
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </nav>
      <section className="relative flex min-h-screen items-center overflow-hidden px-5 pb-20 pt-32 lg:px-10">
        <div className="vertex-grid absolute inset-0 opacity-45" />
        <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4ADE80]/[.055] blur-[90px]" />
        <div
          data-orbit
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,780px)] w-[min(78vw,780px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4ADE80]/15"
        >
          <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-[#4ADE80] shadow-[0_0_25px_#4ADE80]" />
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 rounded-full bg-[#10B981]" />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-col items-center text-center">
          <div
            data-hero-copy
            className="vertex-mono mb-10 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4ADE80]"
          >
            <span className="h-px w-8 bg-[#4ADE80]" />
            Independent client operations
            <span className="h-px w-8 bg-[#4ADE80]" />
          </div>
          <h1 className="w-full max-w-6xl overflow-hidden text-[clamp(3.4rem,7.4vw,8.2rem)] font-medium leading-[.92] tracking-[-.065em]">
            <span data-reveal className="block">
              Systems that move
            </span>
            <span data-reveal className="block text-[#4ADE80]">
              client work forward.
            </span>
          </h1>
          <p
            data-hero-copy
            className="mt-9 max-w-2xl text-[clamp(1rem,1.4vw,1.2rem)] leading-8 text-[#A1A1AA]"
          >
            KiguFlow connects onboarding, project execution, client action,
            files, and delivery in one resilient operating layer.
          </p>
          <div
            data-hero-copy
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <a
              href="/login"
              className="vertex-button rounded-[8px] bg-[#4ADE80] px-6 py-3.5 font-semibold text-[#010A04]"
            >
              Activate KiguFlow
            </a>
            <a
              href="#system"
              className="vertex-button rounded-[8px] border border-white/20 bg-white/[.04] px-6 py-3.5 font-semibold text-white"
            >
              Explore the system
            </a>
          </div>
        </div>
        <div className="vertex-mono absolute bottom-7 left-10 hidden text-[10px] uppercase tracking-[.18em] text-white/35 md:block">
          One admin / Many clients / Zero ambiguity
        </div>
        <div className="vertex-mono absolute bottom-7 right-10 hidden text-[10px] uppercase tracking-[.18em] text-white/35 md:block">
          Scroll to inspect
        </div>
      </section>
      <section className="overflow-hidden border-y border-white/10 bg-[#050f08] py-5">
        <div className="vertex-marquee flex w-max items-center gap-12 whitespace-nowrap text-sm font-medium text-white/40">
          {[...Array(2)].flatMap((_, set) =>
            [
              "CLIENTS",
              "PROJECTS",
              "PHASES",
              "TASKS",
              "BRIEFS",
              "FILES",
              "INVOICES",
              "DELIVERY",
            ].map((item) => (
              <span key={`${set}-${item}`} className="flex items-center gap-12">
                <span>{item}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
              </span>
            )),
          )}
        </div>
      </section>
      <section id="system" className="px-5 py-32 lg:px-10 lg:py-48">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-16 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <div className="vertex-mono text-xs uppercase tracking-[.18em] text-[#4ADE80]">
              Built for operational clarity
            </div>
            <h2 className="text-[clamp(2.8rem,5vw,6rem)] font-medium leading-[.98] tracking-[-.055em]">
              A durable system beneath every client relationship.
            </h2>
          </div>
          <div className="grid-flow-dense grid border-l border-t border-white/10 lg:grid-cols-12 lg:grid-rows-2">
            <article
              data-scale
              className="group relative min-h-[540px] overflow-hidden border-b border-r border-white/10 bg-[#191C21] p-7 lg:col-span-6 lg:row-span-2 lg:p-10"
            >
              <div className="vertex-grid absolute inset-0 opacity-20" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <Lightning className="text-[#4ADE80]" size={30} />
                  <span className="vertex-mono text-[10px] text-white/35">
                    KIGUFLOW CORE
                  </span>
                </div>
                <p className="my-auto py-16 text-[clamp(2.4rem,4vw,4.8rem)] font-medium leading-[.98] tracking-[-.055em]">
                  Every next move, visible in one place.
                </p>
                <div className="grid grid-cols-3 border-t border-white/10 pt-6 text-sm">
                  <span className="text-white/35">Input</span>
                  <span className="text-white/35">Process</span>
                  <span className="text-[#4ADE80]">Delivery</span>
                </div>
              </div>
            </article>
            {systems.map(({ icon: Icon, title, copy, code }) => (
              <article
                key={title}
                data-scale
                className="group flex min-h-[270px] flex-col border-b border-r border-white/10 bg-[#0b110e] p-7 transition-colors duration-500 hover:bg-[#191C21] lg:col-span-2 lg:row-span-2"
              >
                <Icon
                  className="text-[#4ADE80] transition-transform duration-500 group-hover:scale-110"
                  size={28}
                />
                <div className="mt-auto">
                  <span className="vertex-mono text-[9px] tracking-[.14em] text-white/30">
                    {code}
                  </span>
                  <h3 className="mt-4 text-2xl font-medium tracking-[-.04em]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">
                    {copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        id="workflow"
        className="border-y border-white/10 bg-[#050f08] px-5 py-32 lg:px-10 lg:py-48"
      >
        <div className="mx-auto grid max-w-[1480px] gap-16 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <div className="vertex-mono text-xs uppercase tracking-[.18em] text-[#4ADE80]">
              One connected workflow
            </div>
            <h2 className="mt-7 text-[clamp(2.8rem,5vw,5.7rem)] font-medium leading-[.96] tracking-[-.055em]">
              From first contact to final handoff.
            </h2>
            <p className="mt-7 max-w-md leading-7 text-[#A1A1AA]">
              Each stage creates the context for the next. Nothing important
              disappears into an inbox.
            </p>
          </div>
          <div className="space-y-5">
            {[
              [
                "Client intake",
                "Capture who the work is for and what success means.",
              ],
              [
                "Project system",
                "Generate reusable phases and tasks, then adapt them freely.",
              ],
              [
                "Shared execution",
                "Expose only the work and actions the client needs to see.",
              ],
              [
                "Delivery record",
                "Preserve files, invoices, decisions, and final project history.",
              ],
            ].map(([title, copy], index) => (
              <article
                data-stack
                key={title}
                className="group sticky top-28 overflow-hidden rounded-[8px] border border-white/10 bg-[#191C21] p-7 shadow-[0_30px_80px_rgba(0,0,0,.45)] lg:p-9"
              >
                <div className="flex gap-6">
                  <span className="vertex-mono mt-1 text-xs text-[#4ADE80]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-3xl font-medium tracking-[-.045em]">
                      {title}
                    </h3>
                    <p className="mt-3 max-w-xl leading-7 text-[#A1A1AA]">
                      {copy}
                    </p>
                  </div>
                  <ArrowRight className="ml-auto text-white/25 transition-all group-hover:translate-x-2 group-hover:text-[#4ADE80]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="control" className="px-5 py-32 lg:px-10 lg:py-48">
        <div className="mx-auto max-w-[1480px]">
          <div className="vertex-mono text-xs uppercase tracking-[.18em] text-[#4ADE80]">
            Designed for real work
          </div>
          <h2 className="mt-7 max-w-6xl text-[clamp(2.8rem,5.6vw,7rem)] font-medium leading-[.95] tracking-[-.06em]">
            Control the operation. Keep the experience calm.
          </h2>
          <div className="mt-16 flex min-h-[560px] flex-col gap-2 lg:flex-row">
            {[
              [
                "Admin command",
                "See every client, project, due date, and blocker.",
              ],
              [
                "Project execution",
                "Move work through phases with real persisted state.",
              ],
              [
                "Client clarity",
                "Surface progress, actions, files, and invoices without noise.",
              ],
            ].map(([title, copy], index) => (
              <article
                key={title}
                className="group relative flex-1 overflow-hidden rounded-[8px] border border-white/10 bg-[#191C21] p-7 transition-[flex] duration-700 ease-out hover:flex-[2.2]"
              >
                <img
                  src={`https://picsum.photos/seed/vertex-system-${index}/1200/1500`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#010A04] via-[#010A04]/40 to-transparent" />
                <div className="relative mt-auto flex h-full flex-col justify-end">
                  <span className="vertex-mono text-[10px] text-[#4ADE80]">
                    CONTROL SURFACE
                  </span>
                  <h3 className="mt-4 text-3xl font-medium tracking-[-.045em]">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-md leading-7 text-white/55 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                    {copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-white/10 bg-[#4ADE80] px-5 py-28 text-[#010A04] lg:px-10 lg:py-40">
        <div className="mx-auto flex max-w-[1480px] flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
          <div>
            <div className="vertex-mono text-xs uppercase tracking-[.18em]">
              Ready when the next client is
            </div>
            <h2 className="mt-7 max-w-5xl text-[clamp(3.2rem,6vw,7.5rem)] font-medium leading-[.9] tracking-[-.065em]">
              Put every project on solid ground.
            </h2>
          </div>
          <a
            href="/login"
            className="vertex-button flex shrink-0 items-center gap-4 rounded-[8px] bg-[#010A04] px-6 py-4 font-semibold text-white"
          >
            Enter workspace
            <ArrowRight />
          </a>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-[#010A04] px-5 py-9 lg:px-10">
        <div className="vertex-mono mx-auto flex max-w-[1480px] flex-col justify-between gap-4 text-[10px] uppercase tracking-[.15em] text-white/35 md:flex-row">
          <span>KiguFlow / Independent client operations</span>
          <span>Built for clarity, tuned for delivery</span>
        </div>
      </footer>
    </main>
  );
}
