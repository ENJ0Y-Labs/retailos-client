"use client";

import { useEffect, useState } from "react";

import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { DailyBrief, DashboardStats, SaleSummary } from "@/lib/types";
import { formatNigeriaDate, formatNigeriaDateTime } from "@/lib/nigeria-time";

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
        <p className="mt-1 text-xs text-white/45">Daily sales reporting date (Africa/Lagos): {brief?.date ? formatNigeriaDate(brief.date + "T12:00:00+01:00") : "Date not provided by the server"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardMetric label="Products" value={stats.products_count} />
          <DashboardMetric label="Low-stock products" value={stats.low_stock_count} />
          <DashboardMetric label="Open alerts" value={stats.open_alerts_count} />
          <DashboardMetric label="Sales in reporting period" value={stats.today_sales_count} />
          <DashboardMetric label="Sales total in reporting period" value={"₦" + Number(stats.today_sales_total).toLocaleString("en-NG")} />
        </div>
      </section>

      <section aria-labelledby="daily-brief" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="daily-brief" className="font-semibold">Daily Business Brief</h2>
        {brief ? <pre className="mt-3 overflow-x-auto text-sm">{JSON.stringify(brief, null, 2)}</pre> : <p className="mt-3 text-sm text-white/50">Today&apos;s business brief is not available.</p>}
      </section>

      <section aria-labelledby="recent-sales" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="recent-sales" className="font-semibold">Recent sales</h2>
        <p className="mt-1 text-xs text-white/45">Timestamps are displayed in Africa/Lagos time (WAT, UTC+01:00).</p>
        {sales.length > 0 ? (
          <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40"><tr><th className="px-3 py-2">DATE & TIME (WAT)</th><th className="px-3 py-2">SALE</th><th className="px-3 py-2">TOTAL</th></tr></thead>
            <tbody>{sales.map((sale) => <tr key={sale.id} className="border-t border-white/5"><td className="px-3 py-3">{formatNigeriaDateTime(sale.created_at)}</td><td className="px-3 py-3">#{sale.id}</td><td className="px-3 py-3">₦{Number(sale.total_amount).toLocaleString("en-NG")}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="mt-3 text-sm text-white/50">No sales have been recorded yet.</p>}
      </section>
    </DashboardShell>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-white/45">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>;
}
