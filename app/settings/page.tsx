"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import DashboardShell from "@/components/layout/DashboardShell";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // AuthProvider clears client auth state and redirects even if the server request fails.
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DashboardShell title="Settings">
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Account</h2>
            <p className="mt-2 text-sm text-white/50">You are signed in to TX RetailOS with this account.</p>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/40">Username</dt>
                <dd className="mt-1">{user?.username || "Not available"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/40">Email</dt>
                <dd className="mt-1 break-all">{user?.email || "Not available"}</dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="shrink-0 rounded-lg border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 className="font-semibold">Store profile</h2>
        <p className="mt-2 text-sm text-white/50">Current store information from your authenticated session.</p>
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">Store name</dt>
            <dd className="mt-1">{user?.store_name || "No store name available"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">Store ID</dt>
            <dd className="mt-1">{user?.store_id ?? "Not assigned"}</dd>
          </div>
        </dl>
        <p role="status" className="mt-5 rounded-lg bg-white/5 p-3 text-sm text-white/60">
          Store editing is unavailable because the current Flask API does not expose a store settings endpoint. Editing has been disabled rather than sending unsupported requests.
        </p>
      </section>

      <div className="mt-5 space-y-4">
        {[
          ["Profile", "Profile editing and PIN setup are not available in the current API."],
          ["Notifications", "Notification preferences are not available in the current API."],
          ["Devices", "Managing logged-in devices is not available in the current API."],
        ].map(([title, description]) => (
          <section key={title} className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-white/60">{description}</p>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
