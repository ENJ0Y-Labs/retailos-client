"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Authentication can be connected to the RetailOS backend when available.
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-lg font-bold tracking-tight">
            TX <span className="text-orange-500">RetailOS</span>
          </p>
        </div>

        <div className="mb-7">
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-white/55">
            Sign in to continue to your RetailOS workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">
              Username
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. john_doe"
              autoComplete="username"
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">
              Password
            </span>
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 pr-20 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/45 transition hover:text-orange-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 active:scale-[0.99]"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
