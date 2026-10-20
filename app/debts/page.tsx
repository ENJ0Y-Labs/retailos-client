"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";

type OwingCustomer = {
  id: number;
  name: string;
  contact: string | null;
  outstanding_balance: string;
};

const money = (value: string | number) =>
  "₦" + Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function DebtsPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [customers, setCustomers] = useState<OwingCustomer[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState("0.00");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) {
      setCustomers([]);
      setError("No store is associated with this account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api<{ customers: OwingCustomer[]; total_outstanding: string }>(
        `/customers/owes?store_id=${encodeURIComponent(String(storeId))}`,
      );
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setTotalOutstanding(data.total_outstanding ?? "0.00");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load outstanding balances.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell title="Who Owes Me">
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <section className="mb-5 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
        <p className="text-sm text-white/50">Total outstanding</p>
        <p className="mt-2 text-2xl font-semibold text-orange-400">{money(totalOutstanding)}</p>
      </section>
      <section className="space-y-3">
        {loading ? (
          <p className="py-10 text-center text-white/40">Loading outstanding balances…</p>
        ) : customers.map((customer) => (
          <article key={customer.id} className="rounded-xl border border-white/10 bg-[#151515] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{customer.name}</h2>
                <p className="mt-1 text-sm text-white/50">{customer.contact || "No contact recorded"}</p>
                <p className="mt-1 text-xs text-white/35">Customer #{customer.id}</p>
              </div>
              <p className="font-semibold text-orange-300">{money(customer.outstanding_balance)}</p>
            </div>
          </article>
        ))}
        {!loading && customers.length === 0 && !error && (
          <p className="py-10 text-center text-white/40">No outstanding customer balances.</p>
        )}
      </section>
      <p className="mt-5 text-xs text-white/40">
        This view is read-only. The current API can list outstanding customer balances but does not provide a repayment-recording endpoint.
      </p>
    </DashboardShell>
  );
}
