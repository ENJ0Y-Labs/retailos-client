"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatNigeriaDateTime } from "@/lib/nigeria-time";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { InventoryMovement, Product, ProductType } from "@/lib/types";
import CsvImport from "@/components/inventory/CsvImport";

export default function InventoryPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [movementProduct, setMovementProduct] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "0",
    threshold: "",
    productType: "Physical" as ProductType,
    baseUnit: "piece",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const actionLock = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        if (!storeId) throw new Error("No store is associated with this account");
        const data = await api<{ products: Product[] }>("/product/list?store_id=" + storeId);
        setProducts(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load inventory");
      }
    }

    async function loadMovements() {
      try {
        if (!storeId) throw new Error("No store is associated with this account");
        const data = await api<{ movements: InventoryMovement[] }>("/product/movements?store_id=" + storeId);
        setMovements(data.movements);
        setMovementProduct(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load movements");
      }
    }

    void Promise.all([load(), loadMovements()]);
  }, [storeId]);

  async function loadMovements(productId?: number) {
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      let path = "/product/movements?store_id=" + id;
      if (productId) path += "&product_id=" + productId;
      const data = await api<{ movements: InventoryMovement[] }>(path);
      setMovements(data.movements);
      setMovementProduct(productId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load movements");
    }
  }

  function reset() {
    setEditing(null);
    setForm({
      name: "",
      price: "",
      stock: "0",
      threshold: "",
      productType: "Physical",
      baseUnit: "piece",
    });
  }

  function beginEdit(product: Product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock_quantity),
      threshold: product.low_stock_threshold == null ? "" : String(product.low_stock_threshold),
      productType: product.product_type,
      baseUnit: product.base_unit,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction("save");
    setError("");
    setMessage("");
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      const commonPayload = {
        store_id: id,
        name: form.name.trim(),
        price: Number(form.price),
        base_unit: form.baseUnit.trim(),
        low_stock_threshold: form.threshold === "" ? null : Number(form.threshold),
      };
      if (editing) {
        await api("/product/update", {
          method: "PATCH",
          json: { ...commonPayload, id: editing, stock_quantity: Number(form.stock) },
        });
        setMessage("Product updated.");
      } else {
        await api("/product/create", {
          method: "POST",
          json: {
            ...commonPayload,
            product_type: form.productType,
            opening_stock: Number(form.stock),
          },
        });
        setMessage("Product created.");
      }
      reset();
      await loadProducts();
    } catch (e) {
      setMessage("");
      setError(e instanceof Error ? e.message : "Unable to save product");
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  async function loadProducts() {
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      const data = await api<{ products: Product[] }>("/product/list?store_id=" + id);
      setProducts(data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inventory");
    }
  }

  async function adjust(product: Product, change: number) {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction("adjust-" + product.id);
    setError("");
    setMessage("");
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      await api("/product/adjust", { method: "POST", json: { store_id: id, id: product.id, quantity_change: change, reason: "Manual stock adjustment" } });
      setMessage("Stock adjusted for " + product.name + ".");
      await loadProducts();
    } catch (e) {
      setMessage("");
      setError(e instanceof Error ? e.message : "Unable to adjust stock");
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  async function remove(productId: number) {
    if (actionLock.current || !confirm("Delete this product?")) return;
    actionLock.current = true;
    setPendingAction("delete-" + productId);
    setError("");
    setMessage("");
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      await api("/product/delete", { method: "DELETE", json: { store_id: id, id: productId } });
      setMessage("Product deleted.");
      await loadProducts();
    } catch (e) {
      setMessage("");
      setError(e instanceof Error ? e.message : "Unable to delete product");
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  return (
    <DashboardShell title="Inventory">
      {message && <p className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={save} className="grid gap-3 rounded-2xl border border-white/10 bg-[#151515] p-5 md:grid-cols-4">
        <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" placeholder="Product name" />
        <input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="field" placeholder="Price" />
        <input required min="0" type="number" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="field" placeholder={editing ? "Stock quantity" : "Opening stock"} />
        <select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value as ProductType })} className="field" aria-label="Product type" disabled={Boolean(editing)}>
          <option value="Physical">Physical product</option>
          <option value="Service">Service</option>
        </select>
        <input required minLength={1} maxLength={20} value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} className="field" placeholder="Base unit (e.g. piece)" disabled={form.productType === "Service"} />
        <input min="0" type="number" step="1" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="field" placeholder="Low-stock threshold" />
        <div className="flex gap-2 md:col-span-4">
          <button disabled={pendingAction !== null} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">{pendingAction === "save" ? "Saving..." : editing ? "Save changes" : "Add product"}</button>
          {editing && <button type="button" disabled={pendingAction !== null} onClick={reset} className="rounded-xl bg-white/10 px-4 py-3 text-sm disabled:opacity-50">Cancel</button>}
        </div>
      </form>
      <CsvImport storeId={storeId} onImported={loadProducts} />
      <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">NAME</th><th className="px-3 py-3">TYPE</th><th className="px-3 py-3">BASE UNIT</th><th className="px-3 py-3">SELLING UNITS</th><th className="px-3 py-3">PRICE</th><th className="px-3 py-3">STOCK</th><th className="px-3 py-3">THRESHOLD</th><th className="px-3 py-3">ACTIONS</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-white/5">
                <td className="px-3 py-4">{product.name}</td>
                <td className="px-3 py-4">{product.product_type}</td>
                <td className="px-3 py-4">{product.base_unit}</td>
                <td className="px-3 py-4">
                  <div className="space-y-1">
                    {(product.units ?? []).map((unit) => (
                      <p key={unit.id} className="whitespace-nowrap text-xs text-white/60">
                        {unit.name}: {unit.base_quantity} {product.base_unit} · ₦{Number(unit.price).toLocaleString("en-NG")}
                      </p>
                    ))}
                    {!product.units?.length && <span className="text-white/30">No units configured</span>}
                  </div>
                </td>
                <td className="px-3 py-4">₦{Number(product.price).toLocaleString()}</td>
                <td className="px-3 py-4">{product.stock_quantity} {product.base_unit}</td>
                <td className="px-3 py-4">{product.low_stock_threshold ?? "—"}</td>
                <td className="px-3 py-4"><div className="flex flex-wrap gap-2">
                  <button disabled={pendingAction !== null} onClick={() => adjust(product, 1)} className="rounded bg-white/10 px-2 py-1 text-xs disabled:opacity-40">{pendingAction === "adjust-" + product.id ? "Updating..." : "+1"}</button>
                  <button disabled={pendingAction !== null || product.stock_quantity <= 0} onClick={() => adjust(product, -1)} className="rounded bg-white/10 px-2 py-1 text-xs disabled:opacity-30">-1</button>
                  <button disabled={pendingAction !== null} onClick={() => beginEdit(product)} className="rounded bg-white/10 px-2 py-1 text-xs disabled:opacity-40">Edit</button>
                  <button disabled={pendingAction !== null} onClick={() => remove(product.id)} className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-300 disabled:opacity-40">{pendingAction === "delete-" + product.id ? "Deleting..." : "Delete"}</button>
                  <button onClick={() => loadMovements(product.id)} className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300">Movements</button>
                </div></td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-white/30">No products yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="mt-6 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">Inventory movements</h2><p className="mt-1 text-xs text-white/35">{movementProduct ? "Product #" + movementProduct : "All store movements"}</p></div>
          <button onClick={() => loadMovements()} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Refresh all</button>
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">PRODUCT</th><th className="px-3 py-3">CHANGE</th><th className="px-3 py-3">NEW STOCK</th><th className="px-3 py-3">REASON</th></tr></thead>
          <tbody>
            {movements.map((m) => <tr key={m.id} className="border-t border-white/5"><td className="px-3 py-3">{formatNigeriaDateTime(m.created_at)}</td><td className="px-3 py-3">#{m.product_id}</td><td className="px-3 py-3">{m.quantity_change > 0 ? "+" + m.quantity_change : m.quantity_change}</td><td className="px-3 py-3">{m.new_quantity}</td><td className="px-3 py-3">{m.reason || "—"}</td></tr>)}
            {!movements.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-white/30">No movements yet.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </DashboardShell>
  );
}
