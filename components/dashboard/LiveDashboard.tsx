"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { api } from "@/lib/api";

type User = { id:number; username:string; email:string; store_id:number|null; store_name?:string|null };
type Dashboard = { products_count:number; low_stock_count:number; open_alerts_count:number; today_sales_count:number; today_sales_total:string };
type Sale = { id:number; customer_id:number|null; total_amount:string; created_at:string };

export default function LiveDashboard() {
  const [user,setUser]=useState<User|null>(null);
  const [data,setData]=useState<Dashboard|null>(null);
  const [sales,setSales]=useState<Sale[]>([]);
  const [error,setError]=useState("");

  useEffect(() => {
    (async()=> {
      try {
        const current = await api<{user:User}>("/auth/me");
        setUser(current.user);
        if (!current.user.store_id) throw new Error("No store is associated with this account");
        const [dashboard, recent] = await Promise.all([
          api<Dashboard>(`/dashboard?store_id=${current.user.store_id}`),
          api<{sales:Sale[]}>(`/sales?store_id=${current.user.store_id}`)
        ]);
        setData(dashboard); setSales(recent.sales.slice(0,5));
      } catch(e) { setError(e instanceof Error ? e.message : "Unable to load dashboard"); }
    })();
  },[]);

  const money=(v:string|number)=>`₦${Number(v).toLocaleString()}`;
  return <DashboardShell user={user?.username || "RetailOS User"} storeName={user?.store_name || undefined} title="Dashboard">
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <Metric title="Today's Sales" value={money(data?.today_sales_total || 0)} />
      <Metric title="Transactions" value={String(data?.today_sales_count || 0)} />
      <Metric title="Products" value={String(data?.products_count || 0)} />
      <Metric title="Low Stock" value={String(data?.low_stock_count || 0)} />
    </div>
    {error && <p className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5"><h2 className="mb-4 font-semibold">Store Health</h2><div className="space-y-2 text-sm"><div className="flex justify-between rounded-lg bg-white/5 p-3"><span>Low-stock products</span><span className="text-orange-400">{data?.low_stock_count ?? "—"}</span></div><div className="flex justify-between rounded-lg bg-white/5 p-3"><span>Open alerts</span><span className="text-orange-400">{data?.open_alerts_count ?? "—"}</span></div></div></section>
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5"><h2 className="mb-4 font-semibold">Quick Actions</h2><div className="flex flex-wrap gap-3"><Link href="/sales" className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black">+ New Sale</Link><Link href="/inventory" className="rounded-xl bg-white/10 px-4 py-3 text-sm">Adjust Stock</Link><Link href="/customers" className="rounded-xl bg-white/10 px-4 py-3 text-sm">Customers</Link></div></section>
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5 lg:col-span-2"><h2 className="mb-4 font-semibold">Recent Transactions</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">AMOUNT</th></tr></thead><tbody>{sales.map(s=><tr key={s.id} className="border-t border-white/5"><td className="px-3 py-3">{new Date(s.created_at).toLocaleString()}</td><td className="px-3 py-3">#{s.id}</td><td className="px-3 py-3">{money(s.total_amount)}</td></tr>)}{!sales.length&&<tr><td colSpan={3} className="px-3 py-10 text-center text-white/30">No transactions yet.</td></tr>}</tbody></table></div></section>
    </div>
  </DashboardShell>;
}
function Metric({title,value}:{title:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-[#151515] p-5"><p className="text-xs text-white/40">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>}
