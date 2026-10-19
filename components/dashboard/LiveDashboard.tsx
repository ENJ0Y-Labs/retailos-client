"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { DailyBrief, DashboardStats, SaleSummary, User } from "@/lib/types";

type DashboardResponse = {
  stats?: DashboardStats;
  brief?: DailyBrief;
  sales?: SaleSummary[];
  recent_sales?: SaleSummary[];
};

export default function LiveDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const currentUser = user as User & { role?: string };
  const role = currentUser.role === "admin" || currentUser.role === "manager"
    ? currentUser.role
    : "employee";

  useEffect(() => {
    let cancelled = false;

    api<DashboardResponse>("/dashboard")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const money = (value: string | number) => "₦" + Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const stats = data?.stats;
  const brief = data?.brief;
  const sales = data?.sales ?? data?.recent_sales ?? [];

  return (
    <DashboardShell role={role} user={currentUser.username || currentUser.email} title="Dashboard">
      {loading && <p role="status" className="mb-4 text-sm text-white/75">Loading store data…</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Today's Sales" value={money(brief?.sales.today_total ?? stats?.today_sales_total ?? 0)} />
        <Metric title="Transactions Today" value={String(stats?.today_sales_count ?? 0)} />
        <Metric title="Products" value={String(stats?.products_count ?? 0)} />
        <Metric title="Open Alerts" value={String(stats?.open_alerts_count ?? 0)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Sales direction</h2>
          <p className="mt-4 text-3xl font-semibold">{brief?.sales.status ?? "STEADY"}</p>
          <p className="mt-2 text-sm text-white/40">
            {brief?.sales.change_percent ?? "0.00"}% compared with yesterday
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Restock recommendations</h2>
          <div className="mt-4 space-y-2">
            {brief?.insights.restock_recommendations.length
              ? brief.insights.restock_recommendations.map((item) => (
                <div key={item.product_id} className="flex justify-between rounded-lg bg-white/5 p-3 text-sm">
                  <span>{item.product_name}</span>
                  <span className="text-orange-400">{item.stock_quantity} / {item.low_stock_threshold ?? "—"}</span>
                </div>
              ))
              : <p className="text-sm text-white/40">No restock recommendations.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5 lg:col-span-2">
          <h2 className="font-semibold">Recent transactions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-white/40">
                <tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">SALE</th><th className="px-3 py-3">TOTAL</th></tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-white/5">
                    <td className="px-3 py-3">{new Date(sale.created_at).toLocaleString("en-NG")}</td>
                    <td className="px-3 py-3">#{sale.id}</td>
                    <td className="px-3 py-3">{money(sale.total_amount)}</td>
                  </tr>
                ))}
                {!sales.length && <tr><td colSpan={3} className="px-3 py-10 text-center text-white/30">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#151515] p-5"><p className="text-xs text-white/40">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
