"use client";

import { useEffect, useState } from "react";

import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { DailyBrief, DashboardStats, SaleSummary } from "@/lib/types";

type DashboardResponse = {
  stats: DashboardStats;
  brief: DailyBrief | null;
  sales: SaleSummary[];
};

export default function LiveDashboard() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        if (!storeId) throw new Error("No store is associated with this account.");
        const response = await api<DashboardResponse>(
          "/dashboard?store_id=" + encodeURIComponent(String(storeId)),
        );

        if (cancelled) return;
        setStats(response.stats);
        setBrief(response.brief ?? null);
        setSales(response.sales ?? []);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [storeId, retryCount]);

  if (loading) {
    return (
      <section aria-live="polite" aria-busy="true">
        <p>Loading dashboard...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
        <button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }}>
          Retry
        </button>
      </section>
    );
  }

  if (!stats) {
    return <section><p>Dashboard data is unavailable.</p></section>;
  }

  return (
    <DashboardShell title="Dashboard">
      <header>
        <h2 className="text-lg font-semibold">
          Welcome{user?.username ? `, ${user.username}` : ""}.
        </h2>
      </header>

      <section aria-labelledby="dashboard-summary" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="dashboard-summary" className="font-semibold">Business summary</h2>
        <pre className="mt-3 overflow-x-auto text-sm">{JSON.stringify(stats, null, 2)}</pre>
      </section>

      <section aria-labelledby="daily-brief" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="daily-brief" className="font-semibold">Daily Business Brief</h2>
        {brief ? <pre className="mt-3 overflow-x-auto text-sm">{JSON.stringify(brief, null, 2)}</pre> : <p className="mt-3 text-sm text-white/50">Today&apos;s business brief is not available.</p>}
      </section>

      <section aria-labelledby="recent-sales" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="recent-sales" className="font-semibold">Recent sales</h2>
        {sales.length > 0 ? <pre className="mt-3 overflow-x-auto text-sm">{JSON.stringify(sales, null, 2)}</pre> : <p className="mt-3 text-sm text-white/50">No sales have been recorded yet.</p>}
      </section>
    </DashboardShell>
  );
}
