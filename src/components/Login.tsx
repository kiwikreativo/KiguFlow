import { useState, type FormEvent } from "react";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Login() {
  const [error, setError] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') === 'inactive' ? 'Your session expired after 10 minutes of inactivity. Please sign in again.' : "");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      window.location.href = "/dashboard";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <main className="login-page grain relative grid min-h-screen overflow-hidden bg-[#010A04] p-5 text-white lg:grid-cols-[1.05fr_.95fr] lg:p-8">
      <a href="/" className="absolute left-8 top-8 z-10 text-lg font-bold">
        KiguFlow
      </a>
      <ThemeToggle className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8" />
      <section className="relative hidden items-end overflow-hidden rounded-[8px] border border-white/10 bg-[linear-gradient(to_top,#010A04,transparent),url('https://picsum.photos/seed/vertex-access/1400/1600')] bg-cover bg-center p-14 grayscale contrast-125 lg:flex">
        <div className="max-w-xl">
          <p className="text-[4.7rem] font-semibold leading-[.9] tracking-[-.07em]">
            The calm side of client work.
          </p>
          <p className="mt-7 max-w-md text-lg text-white/70">
            Projects, decisions, and next steps in one private workspace.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-2 py-24">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80]">
            <LockKey size={23} />
          </div>
          <h1 className="text-5xl font-semibold tracking-[-.06em]">
            Welcome back.
          </h1>
          <p className="mt-3 text-white/55">
            Sign in to manage your client work.
          </p>
          <div className="mt-10 grid gap-5">
            <label className="label text-white/70">
              Email
              <input
                className="field bg-white/10 text-white"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="label text-white/70">
              Password
              <input
                className="field bg-white/10 text-white"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="vertex-button mt-2 flex items-center justify-between rounded-[8px] bg-[#4ADE80] px-5 py-4 font-bold text-[#010A04] disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
