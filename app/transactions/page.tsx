"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import { formatNigeriaDateTime } from "@/lib/nigeria-time";
import type { Receipt } from "@/lib/types";

type SaleRow = {
  id: number;
  client_transaction_id: string | null;
  customer_id: number | null;
  total_amount: string;
  amount_paid: string;
  balance: string;
  payment_method: "Cash" | "Transfer" | "POS";
  created_at: string;
};

const money = (value: string | number) =>
  "₦" + Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TransactionsPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) {
      setRows([]);
      setError("No store is associated with this account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ store_id: String(storeId) });
      if (paymentMethod) params.set("payment_method", paymentMethod);
      const data = await api<{ sales: SaleRow[] }>(`/sales?${params.toString()}`);
      setRows(Array.isArray(data.sales) ? data.sales : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [storeId, paymentMethod]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((sale) =>
      String(sale.id).includes(term) ||
      (sale.client_transaction_id ?? "").toLowerCase().includes(term),
    );
  }, [rows, query]);

  async function showDetails(id: number) {
    if (!storeId) return;
    setDetailsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ id: String(id), store_id: String(storeId) });
      const data = await api<{ receipt: Receipt }>(`/sales/get?${params.toString()}`);
      setSelectedReceipt(data.receipt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load sale details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <DashboardShell title="Transactions">
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <input
            aria-label="Search transactions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by sale ID or transaction ID"
            className="field"
          />
          <select
            aria-label="Filter by payment method"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="field"
          >
            <option value="">All payment methods</option>
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
            <option value="POS">POS</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40">
              <tr>
                {["DATE", "SALE", "TOTAL", "PAYMENT", "PAID", "BALANCE", "DETAILS"].map((heading) =>
                  <th key={heading} className="px-3 py-3">{heading}</th>,
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-white/40">Loading transactions…</td></tr>
              ) : visibleRows.map((sale) => (
                <tr key={sale.id} className="border-t border-white/5">
                  <td className="px-3 py-4">{formatNigeriaDateTime(sale.created_at)}</td>
                  <td className="px-3 py-4">
                    <strong>#{sale.id}</strong>
                    {sale.client_transaction_id && <p className="mt-1 text-xs text-white/40">{sale.client_transaction_id}</p>}
                  </td>
                  <td className="px-3 py-4">{money(sale.total_amount)}</td>
                  <td className="px-3 py-4">{sale.payment_method}</td>
                  <td className="px-3 py-4">{money(sale.amount_paid)}</td>
                  <td className="px-3 py-4">{money(sale.balance)}</td>
                  <td className="px-3 py-4">
                    <button type="button" onClick={() => void showDetails(sale.id)} className="rounded bg-white/10 px-3 py-2 text-xs">
                      View receipt
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-white/40">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailsLoading && <p role="status" className="mt-4 text-sm text-white/50">Loading sale details…</p>}
      {selectedReceipt && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Sale #{selectedReceipt.sale_id}</h2>
              <p className="mt-1 text-sm text-white/50">{formatNigeriaDateTime(selectedReceipt.created_at)}</p>
            </div>
            <button type="button" onClick={() => setSelectedReceipt(null)} className="text-sm text-white/50">Close</button>
          </div>
          <div className="mt-4 space-y-2">
            {selectedReceipt.items.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="flex justify-between gap-4 border-b border-white/5 py-2 text-sm">
                <span>Product #{item.product_id} · {item.quantity} {item.unit_name ?? ""}</span>
                <span>{money(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <p>Total: {money(selectedReceipt.total_amount)}</p>
            <p>Paid: {money(selectedReceipt.amount_paid)}</p>
            <p>Balance: {money(selectedReceipt.balance)}</p>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-white/60">{selectedReceipt.printable_text}</pre>
        </section>
      )}
    </DashboardShell>
  );
}
