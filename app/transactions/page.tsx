"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import { formatNigeriaDateTime } from "@/lib/nigeria-time";
import type { Category, Receipt } from "@/lib/types";

type ExportSaleItem = {
  product_id?: number;
  product_name?: string;
  category_id?: number | null;
  category_name?: string | null;
  quantity?: number | string;
  unit?: string | null;
  unit_name?: string | null;
  unit_conversion?: number | string | null;
  sale_price?: number | string;
  unit_price?: number | string;
  price_at_sale?: number | string;
  line_total?: number | string;
  total?: number | string;
};

type SaleRow = {
  id: number;
  client_transaction_id: string | null;
  customer_id: number | null;
  total_amount: string;
  amount_paid: string;
  balance: string;
  refunded_amount?: string | number;
  net_amount?: string | number;
  payment_method: "Cash" | "Transfer" | "POS";
  created_at: string;
  items?: ExportSaleItem[];
};

type SalesListResponse = { sales: SaleRow[]; summary?: Record<string, string | number | undefined> };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] ?? c));
const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
const dateForFilename = () => new Date().toISOString().slice(0, 10);

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const exportInProgress = useRef(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;
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
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (paymentMethod) params.set("payment_method", paymentMethod);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (categoryId) params.set("category_id", categoryId);
      const data = await api<SalesListResponse>(`/sales?${params.toString()}`, { refresh: true });
      setRows(Array.isArray(data.sales) ? data.sales : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [storeId, paymentMethod, startDate, endDate, categoryId, page]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const params = new URLSearchParams({ store_id: String(storeId) });
    void api<{ categories: Category[] }>(`/categories?${params.toString()}`, { refresh: true })
      .then((data) => { if (!cancelled) setCategories(Array.isArray(data.categories) ? data.categories : []); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, [storeId]);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((sale) =>
      String(sale.id).includes(term) ||
      (sale.client_transaction_id ?? "").toLowerCase().includes(term),
    );
  }, [rows, query]);

  async function exportTransactions(format: "pdf" | "csv") {
    if (!storeId || exportInProgress.current) return;
    exportInProgress.current = true;
    const printWindow = format === "pdf" ? window.open("", "_blank") : null;
    if (format === "pdf" && !printWindow) {
      exportInProgress.current = false;
      setError("The PDF window was blocked. Allow pop-ups for RetailOS and try again.");
      return;
    }
    setExporting(format);
    setError("");
    try {
      const allRows: SaleRow[] = [];
      let exportPage = 1;
      const exportLimit = 100;
      while (true) {
        const params = new URLSearchParams({ store_id: String(storeId), page: String(exportPage), limit: String(exportLimit) });
        if (paymentMethod) params.set("payment_method", paymentMethod);
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        if (categoryId) params.set("category_id", categoryId);
        const data = await api<SalesListResponse>("/sales?" + params.toString(), { refresh: true });
        const batch = Array.isArray(data.sales) ? data.sales : [];
        allRows.push(...batch);
        if (batch.length < exportLimit) break;
        if (++exportPage > 10000) throw new Error("Export stopped because the result set is unexpectedly large.");
      }
      const term = query.trim().toLowerCase();
      const rowsToExport = term ? allRows.filter((sale) => String(sale.id).includes(term) || (sale.client_transaction_id ?? "").toLowerCase().includes(term)) : allRows;
      const totalSales = rowsToExport.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
      const totalPaid = rowsToExport.reduce((sum, sale) => sum + Number(sale.amount_paid || 0), 0);
      const totalBalance = rowsToExport.reduce((sum, sale) => sum + Number(sale.balance || 0), 0);
      const filename = "retailos-transactions-" + (startDate || "all") + "-to-" + (endDate || "today") + "-" + dateForFilename();
      if (format === "csv") {
        const lines = [["Sale ID","Transaction ID","Date","Customer ID","Payment Method","Product ID","Product","Category ID","Category","Quantity","Unit","Unit Conversion","Unit Price","Line Total","Transaction Total","Amount Paid","Balance","Refunded Amount","Net Amount"].map(csvCell).join(",")];
        for (const sale of rowsToExport) {
          for (const item of (sale.items?.length ? sale.items : [null])) {
            lines.push([sale.id,sale.client_transaction_id,sale.created_at,sale.customer_id,sale.payment_method,item?.product_id,item?.product_name,item?.category_id,item?.category_name,item?.quantity,item?.unit ?? item?.unit_name,item?.unit_conversion,item?.sale_price ?? item?.unit_price ?? item?.price_at_sale,item?.line_total ?? item?.total,sale.total_amount,sale.amount_paid,sale.balance,sale.refunded_amount ?? 0,sale.net_amount ?? sale.total_amount].map(csvCell).join(","));
          }
        }
        lines.push("");
        lines.push(["TOTALS","","","","","","","","","","","","",totalSales,totalPaid,totalBalance].map(csvCell).join(","));
        const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = filename + ".csv";
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        return;
      }
      if (!printWindow) throw new Error("Unable to open PDF export window.");
      const tableRows = rowsToExport.map((sale) => {
        const items = (sale.items ?? []).map((item) => "<li>" + escapeHtml(item.product_name ?? ("Product #" + (item.product_id ?? ""))) + ": " + escapeHtml(item.quantity ?? "") + " " + escapeHtml(item.unit ?? item.unit_name ?? "") + " · " + escapeHtml(money(item.line_total ?? item.total ?? 0)) + "</li>").join("");
        return "<tr><td>" + escapeHtml(formatNigeriaDateTime(sale.created_at)) + "<br><small>#" + sale.id + "</small></td><td>" + escapeHtml(sale.payment_method) + "</td><td>" + (items ? "<ul>" + items + "</ul>" : "Item details unavailable") + "</td><td>" + escapeHtml(money(sale.total_amount)) + "</td><td>" + escapeHtml(money(sale.amount_paid)) + "</td><td>" + escapeHtml(money(sale.balance)) + "</td></tr>";
      }).join("");
      const categoryName = categories.find((category) => String(category.id) === categoryId)?.name || "All categories";
      printWindow.document.write("<!doctype html><html><head><meta charset='utf-8'><title>" + escapeHtml(filename) + "</title><style>body{font:12px Arial;color:#222;margin:28px}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}th{background:#eee}ul{margin:0;padding-left:16px}@media print{tr{break-inside:avoid}}</style></head><body><h1>RetailOS Transactions</h1><p>Dates: " + escapeHtml(startDate || "All dates") + " to " + escapeHtml(endDate || "Today") + " · Category: " + escapeHtml(categoryName) + " · Payment: " + escapeHtml(paymentMethod || "All methods") + "</p><p>Transactions: " + rowsToExport.length + " · Total sales: " + escapeHtml(money(totalSales)) + " · Paid: " + escapeHtml(money(totalPaid)) + " · Balance: " + escapeHtml(money(totalBalance)) + "</p><table><thead><tr><th>Date / Sale</th><th>Payment</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>" + (tableRows || "<tr><td colspan='6'>No transactions match these filters.</td></tr>") + "</tbody></table><script>window.addEventListener('load',()=>window.print());</script></body></html>");
      printWindow.document.close(); printWindow.focus();
    } catch (cause) {
      printWindow?.close();
      setError(cause instanceof Error ? "Export failed: " + cause.message : "Export failed. Please try again.");
    } finally { exportInProgress.current = false; setExporting(null); }
  }

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
        <div data-tour="transactions-filters" className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            aria-label="Search transactions"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search by sale ID or transaction ID"
            className="field"
          />
          <label className="flex flex-col gap-1 text-xs text-white/50">Start date
            <input aria-label="Filter start date" type="date" value={startDate} max={endDate || undefined} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/50">End date
            <input aria-label="Filter end date" type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="field" />
          </label>
          <select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="field">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select
            aria-label="Filter by payment method"
            value={paymentMethod}
            onChange={(event) => { setPaymentMethod(event.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All payment methods</option>
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
            <option value="POS">POS</option>
          </select>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void exportTransactions("pdf")} disabled={exporting !== null || loading} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {exporting === "pdf" ? "Preparing PDF…" : "Export PDF"}
          </button>
          <button type="button" onClick={() => void exportTransactions("csv")} disabled={exporting !== null || loading} className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:opacity-50">
            {exporting === "csv" ? "Preparing CSV…" : "Export CSV"}
          </button>
          {exporting && <span role="status" className="text-xs text-white/50">Loading all matching transactions…</span>}
        </div>

        <div data-tour="transactions-table" className="overflow-x-auto">
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
        {!loading && visibleRows.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2 text-sm text-white/60">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={visibleRows.length < LIMIT}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
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
                <span>
                  Product #{item.product_id} · {item.quantity} {item.unit_name ?? ""}
                  <span className="mt-1 block text-xs text-white/45">
                    Unit price at sale: {money(item.price_at_sale ?? (Number(item.total) / Math.max(item.quantity, 1)))}
                  </span>
                </span>
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
