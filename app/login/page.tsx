"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in");
      const destination = data.user.role === "ADMIN" ? "/admin-dashboard" : data.user.role === "MANAGER" ? "/manager-dashboard" : "/employee-dashboard";
      window.location.href = destination;
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 text-white">
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-8 shadow-2xl">
      <p className="mb-8 text-lg font-bold tracking-tight">TX <span className="text-orange-500">RetailOS</span></p>
      <div className="mb-7"><h1 className="text-3xl font-semibold">Sign in</h1><p className="mt-2 text-sm text-white/55">Sign in to continue to your RetailOS workspace.</p></div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block"><span className="mb-2 block text-sm font-medium text-white/80">Username</span><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. john_doe" autoComplete="username" className="field" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium text-white/80">Password</span><div className="relative"><input required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?"text":"password"} autoComplete="current-password" className="field pr-20" /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/45 hover:text-orange-400">{showPassword?"Hide":"Show"}</button></div></label>
        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button disabled={loading} type="submit" className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60">{loading?"Signing in…":"Sign in"}</button>
      </form>
    </section>
  </main>;
}
