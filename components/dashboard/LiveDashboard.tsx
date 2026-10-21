"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { DailyBrief, DashboardStats, SaleSummary } from "@/lib/types";
import { formatNigeriaDate, formatNigeriaDateTime } from "@/lib/nigeria-time";

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

        const query = "?store_id=" + encodeURIComponent(String(storeId));
        const [dashboard, dailyBrief, recentSales] = await Promise.all([
          api<DashboardStats>("/dashboard" + query),
          api<DailyBrief>("/dashboard/daily-brief" + query),
          api<{ sales: SaleSummary[] }>("/sales" + query),
        ]);

        if (cancelled) return;
        setStats(dashboard);
        setBrief(dailyBrief);
        setSales(recentSales.sales ?? []);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, [storeId, retryCount]);

  // The shell (sidebar, title, sign out) is always rendered so the layout never
  // jumps. Only the content area changes between loading, error, and loaded.
  return (
    <DashboardShell title="Dashboard">
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <section role="alert" className="rounded-2xl border border-red-500/20 bg-[#151515] p-6">
          <h2 className="font-semibold">Dashboard unavailable</h2>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }}
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Try again
          </button>
        </section>
      ) : !stats ? (
        <p className="text-sm text-white/60">Dashboard data is unavailable.</p>
      ) : (
        <DashboardContent user={user?.username} stats={stats} brief={brief} sales={sales} />
      )}
    </DashboardShell>
  );
}

function DashboardContent({
  user,
  stats,
  brief,
  sales,
}: {
  user?: string;
  stats: DashboardStats;
  brief: DailyBrief | null;
  sales: SaleSummary[];
}) {
  return (
    <>
      <header><h2 className="text-lg font-semibold">Welcome{user ? `, ${user}` : ""}.</h2></header>

      <section aria-labelledby="dashboard-summary" data-tour="dashboard-summary" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="dashboard-summary" className="font-semibold">Business summary</h2>
        <p className="mt-1 text-xs text-white/45">Daily sales reporting date (Africa/Lagos): {brief?.date ? formatNigeriaDate(brief.date + "T12:00:00+01:00") : "Date not provided by the server"}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardMetric label="Products" value={stats.products_count} href="/inventory" />
          <DashboardMetric label="Low-stock products" value={stats.low_stock_count} href="/inventory" />
          <DashboardMetric label="Open alerts" value={stats.open_alerts_count} href="/alerts" />
          <DashboardMetric label="Sales in reporting period" value={stats.today_sales_count} />
          <DashboardMetric label="Sales total in reporting period" value={"₦" + Number(stats.today_sales_total).toLocaleString("en-NG")} />
        </div>
      </section>

      <section aria-labelledby="daily-brief" data-tour="dashboard-brief" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="daily-brief" className="font-semibold">Daily Business Brief</h2>
        {brief ? (
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <h3 className="font-medium">Sales performance</h3>
              <p>Today: ₦{Number(brief.sales.today_total).toLocaleString("en-NG")}</p>
              <p>Yesterday: ₦{Number(brief.sales.yesterday_total).toLocaleString("en-NG")}</p>
              <p>Status: {brief.sales.status}{brief.sales.change_percent != null ? ` (${brief.sales.change_percent}%)` : " (no previous-day comparison available)"}</p>
            </div>
            <div>
              <h3 className="font-medium">Alerts requiring attention</h3>
              {brief.alerts.length ? <ul className="list-disc pl-5">{brief.alerts.map((alert) => <li key={alert.id}>{alert.message}</li>)}</ul> : <p>No open alerts.</p>}
            </div>
            <div>
              <h3 className="font-medium">Restock recommendations</h3>
              {brief.insights.restock_recommendations.length ? (
                <ul className="list-disc pl-5">{brief.insights.restock_recommendations.map((item) => <li key={item.product_id}>{item.product_name}: {item.stock_quantity} in stock (threshold {item.low_stock_threshold ?? "not set"})</li>)}</ul>
              ) : <p>No products currently require restocking.</p>}
            </div>
            <div>
              <h3 className="font-medium">Top-selling product</h3>
              {brief.insights.high_performer ? <p>{brief.insights.high_performer.product_name} ({brief.insights.high_performer.units_sold} units sold)</p> : <p>No sales recorded today yet.</p>}
            </div>
            {brief.insights.declining_product && (
              <div>
                <h3 className="font-medium">Sales to watch</h3>
                <p>{brief.insights.declining_product.product_name}: {brief.insights.declining_product.yesterday_units_sold} units yesterday and {brief.insights.declining_product.today_units_sold} today.</p>
              </div>
            )}
          </div>
        ) : <p className="mt-3 text-sm text-white/50">Today&apos;s business brief is not available.</p>}
      </section>

      <section aria-labelledby="recent-sales" className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 id="recent-sales" className="font-semibold">Recent sales</h2>
        <p className="mt-1 text-xs text-white/45">Timestamps are displayed in Africa/Lagos time (WAT, UTC+01:00).</p>
        {sales.length > 0 ? (
          <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40"><tr><th className="px-3 py-2">DATE &amp; TIME (WAT)</th><th className="px-3 py-2">SALE</th><th className="px-3 py-2">TOTAL</th></tr></thead>
            <tbody>{sales.slice(0, 10).map((sale) => <tr key={sale.id} className="border-t border-white/5"><td className="px-3 py-3">{formatNigeriaDateTime(sale.created_at)}</td><td className="px-3 py-3">#{sale.id}</td><td className="px-3 py-3">₦{Number(sale.total_amount).toLocaleString("en-NG")}</td></tr>)}</tbody>
          </table></div>
        ) : (
          <p className="mt-3 text-sm text-white/70">
            No sales have been recorded yet. <Link href="/sales" className="text-orange-300 underline underline-offset-4">Record your first sale</Link>.
          </p>
        )}
      </section>
    </>
  );
}

function DashboardMetric({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <>
      <p className="text-xs text-white/65">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </>
  );
  if (!href) return <div className="rounded-xl bg-white/5 p-4">{content}</div>;
  return (
    <Link href={href} className="block rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10">
      {content}
    </Link>
  );
}

/* ---------- Loading skeleton (matches the real layout so nothing jumps) ---------- */

function Bar({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded bg-white/10 motion-safe:animate-pulse ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>

      <Bar className="h-6 w-40" />

      <section className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <Bar className="h-5 w-36" />
        <Bar className="mt-2 h-3 w-64 max-w-full" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 p-4">
              <Bar className="h-3 w-24" />
              <Bar className="mt-3 h-6 w-16" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <Bar className="h-5 w-44" />
        <div className="mt-4 space-y-3">
          <Bar className="h-4 w-48" />
          <Bar className="h-4 w-40" />
          <Bar className="h-4 w-72 max-w-full" />
          <Bar className="h-4 w-56 max-w-full" />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <Bar className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-3/4" />
        </div>
      </section>
    </div>
  );
}