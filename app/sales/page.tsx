
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer, Product, ProductUnit, Receipt, SaleSummary } from "@/lib/types";

type SalesProduct = Product;
type Unit = ProductUnit;

type CartItem = {
  product: SalesProduct;
  unitId: number;
  quantity: number;
  price: number;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const money = (value: number) =>
  "₦" +
  value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SalesPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;

  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [query, setQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerContact, setNewCustomerContact] = useState("");
  const [allowDuplicateContact, setAllowDuplicateContact] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paid, setPaid] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const checkoutLock = useRef(false);

  useEffect(() => {
    let pendingId: string | null = null;
    try {
      pendingId = localStorage.getItem("retailos-pending-sale-id");
    } catch {
      // Storage may be unavailable in restricted browser environments.
    }

    void Promise.resolve().then(() => {
      if (pendingId) setTransactionId(pendingId);
    });
  }, []);

  const load = useCallback(async () => {
    if (!storeId) {
      setError("No store is associated with this account.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [productData, customerData, salesData] = await Promise.all([
        api<{ products: SalesProduct[] }>(
          `/product/list?store_id=${encodeURIComponent(String(storeId))}`,
          { refresh: true },
        ),
        api<{ customers: Customer[] }>(
          `/customers?store_id=${encodeURIComponent(String(storeId))}`,
        ),
        api<{ sales: SaleSummary[] }>(
          `/sales?store_id=${encodeURIComponent(String(storeId))}`,
        ),
      ]);

      setProducts(productData.products ?? []);
      setCustomers(customerData.customers ?? []);
      setSales(salesData.sales ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sales.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const filteredCustomers = useMemo(() => {
    const term = customerQuery.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => customer.name.toLowerCase().includes(term) || (customer.contact ?? "").toLowerCase().includes(term));
  }, [customers, customerQuery]);

  const duplicateContactCustomers = useMemo(() => {
    const normalized = normalizePhone(newCustomerContact);
    if (normalized.length < 7) return [];
    return customers.filter((customer) => normalizePhone(customer.contact ?? "") === normalized);
  }, [customers, newCustomerContact]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );

  const total = useMemo(
    () =>
      Math.round(
        cart.reduce((sum, item) => sum + item.price * item.quantity, 0) *
          100,
      ) / 100,
    [cart],
  );

  const amountPaid = paid.trim() === "" ? total : Number(paid);
  const balance = Math.round((total - amountPaid) * 100) / 100;

  function stockFor(product: SalesProduct) {
    return Number(product.stock_quantity ?? 0);
  }

  function unitsFor(product: SalesProduct): Unit[] {
    return Array.isArray(product.units) ? product.units : [];
  }

  function isServiceProduct(product: SalesProduct) {
    return product.product_type.toLowerCase() === "service";
  }

  function addProduct(product: SalesProduct) {
    const unit = unitsFor(product)[0];
    if (!unit) {
      setError(`No selling unit is configured for ${product.name}. Configure a unit before selling this product.`);
      return;
    }

    const isService = isServiceProduct(product);
    const stock = stockFor(product);
    setError("");

    setCart((items) => {
      const index = items.findIndex(
        (item) => item.product.id === product.id && item.unitId === unit.id,
      );
      const nextQuantity = (index >= 0 ? items[index].quantity : 0) + 1;
      const reservedBaseQuantity = items
        .filter((item) => item.product.id === product.id)
        .reduce((sum, item) => {
          const selected = unitsFor(item.product).find((candidate) => candidate.id === item.unitId);
          return sum + item.quantity * Number(selected?.base_quantity ?? 0);
        }, 0);

      if (!isService && reservedBaseQuantity + Number(unit.base_quantity) > stock) {
        setError(`Insufficient stock for ${product.name}.`);
        return items;
      }

      if (index < 0) {
        return [...items, { product, unitId: unit.id, quantity: 1, price: Number(unit.price) }];
      }
      return items.map((item, i) =>
        i === index ? { ...item, quantity: nextQuantity } : item,
      );
    });
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCart((items) => {
      const current = items[index];
      if (!current) return items;

      const updated = { ...current, ...patch };
      if (!Number.isInteger(updated.quantity) || updated.quantity < 1) return items;
      if (!Number.isFinite(updated.price) || updated.price < 0) return items;

      const selectedUnit = unitsFor(updated.product).find((unit) => unit.id === updated.unitId);
      if (!selectedUnit) {
        setError(`The selected selling unit is no longer available for ${updated.product.name}.`);
        return items;
      }

      if (!isServiceProduct(updated.product)) {
        const reservedBaseQuantity = items.reduce((sum, item, itemIndex) => {
          if (item.product.id !== updated.product.id) return sum;
          const line = itemIndex === index ? updated : item;
          const unit = unitsFor(line.product).find((candidate) => candidate.id === line.unitId);
          return sum + line.quantity * Number(unit?.base_quantity ?? 0);
        }, 0);

        if (reservedBaseQuantity > stockFor(updated.product)) {
          setError(`Insufficient stock for ${updated.product.name}.`);
          return items;
        }
      }

      setError("");
      return items.map((item, itemIndex) => itemIndex === index ? updated : item);
    });
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId || creatingCustomer) return;
    if (duplicateContactCustomers.length > 0 && !allowDuplicateContact) {
      setError("This phone number already belongs to a customer. Select the matching customer or confirm that this is a separate person.");
      return;
    }
    setCreatingCustomer(true);
    setError("");
    try {
      const data = await api<{ customer: Customer }>("/customers", { method: "POST", json: { store_id: storeId, name: newCustomerName.trim(), contact: newCustomerContact.trim() || null } });
      setCustomers((current) => [...current, data.customer].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(String(data.customer.id));
      setCustomerQuery(data.customer.name);
      setCustomerModalOpen(false);
      setNewCustomerName("");
      setNewCustomerContact("");
      setAllowDuplicateContact(false);
      setMessage(`Customer ${data.customer.name} created and selected for this sale.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create customer.");
    } finally { setCreatingCustomer(false); }
  }

  async function createSale() {
    if (checkoutLock.current || submitting) return;

    if (!storeId || cart.length === 0) {
      setError("Add at least one item before completing the sale.");
      return;
    }

    if (
      !Number.isFinite(amountPaid) ||
      amountPaid < 0 ||
      amountPaid > total
    ) {
      setError("Enter a valid payment amount between zero and the total.");
      return;
    }

    if (balance > 0 && !customerId) {
      setError("Select a customer before recording an unpaid balance.");
      return;
    }

    // Re-read authoritative product data immediately before checkout because an open cart may contain stale prices.
    try {
      const latest = await api<{ products: SalesProduct[] }>(
        `/product/list?store_id=${encodeURIComponent(String(storeId))}`,
        { refresh: true },
      );
      const latestById = new Map((latest.products ?? []).map((product) => [product.id, product]));
      let priceChanged = false;
      const refreshedCart = cart.map((item) => {
        const currentProduct = latestById.get(item.product.id);
        const currentUnit = currentProduct?.units?.find((unit) => unit.id === item.unitId);
        if (!currentProduct || !currentUnit) { priceChanged = true; return item; }
        const currentPrice = Number(currentUnit.price);
        // Service prices may be intentionally overridden for an individual sale.
        const nextPrice = isServiceProduct(currentProduct) ? item.price : currentPrice;
        if (!isServiceProduct(currentProduct) && currentPrice !== item.price) priceChanged = true;
        return { ...item, product: currentProduct, price: nextPrice };
      });
      setProducts(latest.products ?? []);
      if (priceChanged) {
        setCart(refreshedCart);
        setMessage("Product prices or selling units changed while this cart was open. The cart has been refreshed and the total recalculated. Review the updated total before completing the sale.");
        return;
      }
      setCart(refreshedCart);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify current product prices. Refresh the products and try again.");
      return;
    }

    checkoutLock.current = true;
    setSubmitting(true);
    setError("");
    setMessage("");

    const saleTransactionId = transactionId || crypto.randomUUID();
    setTransactionId(saleTransactionId);

    try {
      const data = await api<{ receipt: Receipt }>("/sales", {
        method: "POST",
        json: {
          store_id: storeId,
          customer_id: customerId ? Number(customerId) : null,
          client_transaction_id: saleTransactionId,
          payment_method: paymentMethod === "CASH" ? "Cash" : paymentMethod === "TRANSFER" ? "Transfer" : "POS",
          amount_paid: amountPaid,
          items: cart.map((item) => ({
            product_id: item.product.id,
            unit_id: item.unitId,
            quantity: item.quantity,
            ...(isServiceProduct(item.product) ? { unit_price: item.price } : {}),
          })),
        },
      });

      setReceipt(data.receipt);
      setMessage(`Sale #${data.receipt.sale_id} completed.`);
      setCart([]);
      setPaid("");
      setCustomerId("");
      setCustomerQuery("");
      setTransactionId("");

      try {
        localStorage.removeItem("retailos-pending-sale-id");
      } catch {
        // Ignore unavailable browser storage.
      }

      await load();
    } catch (e) {
      // Keep the transaction ID so a retry can use the same idempotency key.
      try {
        localStorage.setItem(
          "retailos-pending-sale-id",
          saleTransactionId,
        );
      } catch {
        // The in-memory transaction ID is still retained.
      }

      const failure = e instanceof Error ? e.message : "Unable to complete sale.";
      setError(
        /price.*chang|chang.*price/i.test(failure)
          ? "A product price changed before the sale could be completed. The sale was not completed. Refresh the cart and review the updated total before trying again."
          : failure,
      );
    } finally {
      checkoutLock.current = false;
      setSubmitting(false);
    }
  }

  async function showSaleDetails(id: number) {
    if (!storeId) return;

    try {
      setError("");

      const data = await api<{ receipt: Receipt }>(
        `/sales/get?id=${encodeURIComponent(String(id))}&store_id=${encodeURIComponent(String(storeId))}`,
      );

      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sale details.");
    }
  }

  async function generateReceipt(id: number) {
    if (!storeId) return;

    try {
      setError("");

      const data = await api<{ receipt: Receipt }>("/sales/receipt", {
        method: "POST",
        json: { id, store_id: storeId },
      });

      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate receipt.");
    }
  }

  return (
    <DashboardShell title="Sales">
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .sale-receipt-print, .sale-receipt-print * { visibility: visible !important; } .sale-receipt-print { position: absolute; inset: 0; width: 100%; color: #111 !important; background: #fff !important; border: 0 !important; } .sale-receipt-print pre { color: #111 !important; background: #fff !important; } }`}</style>
      {message && (
        <p role="status" className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">Products and services</h2>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field max-w-sm"
              aria-label="Search products or services"
              data-tour="sales-search"
              placeholder="Search products or services..."
            />
          </div>

          {loading ? (
            <p role="status" className="py-12 text-center text-white/70">Loading products…</p>
          ) : filteredProducts.length === 0 ? (
            <p className="py-12 text-center text-white/70">
              {query ? (
                "No matching products or services."
              ) : (
                <>
                  Nothing to sell yet. <Link href="/inventory" className="text-orange-300 underline underline-offset-4">Add a product or service</Link> first.
                </>
              )}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product, productIndex) => {
                const isService = isServiceProduct(product);
                const stock = stockFor(product);
                const firstUnit = unitsFor(product)[0];

                return (
                  <article
                    key={product.id}
                    className="rounded-xl border border-white/10 bg-[#101010] p-4"
                  >
                    <p className="text-xs text-white/35">#{product.id}</p>
                    <h3 className="mt-1 font-medium">{product.name}</h3>

                    <p className="mt-2 text-xs text-white/50">
                      {isService ? "Service" : `${stock} ${product.base_unit} in stock`}
                    </p>

                    <p className="mt-2 text-orange-400">
                      {money(Number(firstUnit?.price ?? product.price))}
                    </p>

                    <button
                      disabled={!isService && stock <= 0}
                      data-tour={productIndex === 0 ? "sales-add" : undefined}
                      onClick={() => addProduct(product)}
                      className="mt-4 w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:bg-white/10 disabled:text-white/30"
                    >
                      {isService
                        ? "Add service"
                        : stock > 0
                          ? "Add to cart"
                          : "Out of stock"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside data-tour="sales-cart" className="h-fit rounded-2xl border border-white/10 bg-[#151515] p-5 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold">Checkout</h2>

          <div className="mt-5 space-y-3">
            {cart.map((item, index) => {
              const units = unitsFor(item.product);
              const selectedUnit = units.find((unit) => unit.id === item.unitId);
              const baseQuantity =
                Number(selectedUnit?.base_quantity ?? 1) * item.quantity;

              return (
                <div
                  key={`${item.product.id}-${item.unitId}`}
                  className="rounded-lg bg-white/5 p-3 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{item.product.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((items) =>
                          items.filter((_, i) => i !== index),
                        )
                      }
                      className="text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  <label className="mt-3 block text-xs text-white/50">
                    Selling unit
                    <select
                      value={String(item.unitId)}
                      onChange={(event) => {
                        const unit = units.find(
                          (candidate) => candidate.id === Number(event.target.value),
                        );
                        if (unit) {
                          updateCartItem(index, { unitId: unit.id, price: Number(unit.price) });
                        }
                      }}
                      className="field mt-1 w-full"
                    >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} · {unit.base_quantity} {item.product.base_unit} · ₦{Number(unit.price).toLocaleString("en-NG")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartItem(index, {
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      className="rounded bg-white/10 px-3 py-1"
                      aria-label={`Decrease ${item.product.name} quantity`}
                    >
                      −
                    </button>

                    <input
                      aria-label={`Quantity of ${item.product.name}`}
                      className="field w-20"
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateCartItem(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updateCartItem(index, {
                          quantity: item.quantity + 1,
                        })
                      }
                      className="rounded bg-white/10 px-3 py-1"
                      aria-label={`Increase ${item.product.name} quantity`}
                    >
                      +
                    </button>
                  </div>

                  <label className="mt-3 block text-xs text-white/50">
                    Unit price
                    <input
                      className="field mt-1 w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      disabled={!isServiceProduct(item.product)}
                      onChange={(event) =>
                        updateCartItem(index, {
                          price: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <p className="mt-2 text-xs text-white/50">
                    Conversion: {item.quantity} {selectedUnit?.name ?? "unit"} = {baseQuantity} {item.product.base_unit}
                  </p>

                  <p className="mt-1">
                    Line total: {money(item.price * item.quantity)}
                  </p>
                </div>
              );
            })}

            {cart.length === 0 && (
              <p className="py-8 text-center text-sm text-white/70">
                Cart is empty. Press “Add to cart” on a product to start a sale.
              </p>
            )}
          </div>

          <div className="my-5 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

          <div data-tour="sales-payment">
          <label className="block text-sm">
            Amount paid
            <input
              className="field mt-2 w-full"
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={paid}
              placeholder={String(total)}
              onChange={(event) => setPaid(event.target.value)}
            />
          </label>

          <p className="my-3 text-sm">
            Outstanding balance:{" "}
            <strong className={balance > 0 ? "text-orange-300" : ""}>
              {money(balance)}
            </strong>
          </p>

          <div className="my-4">
            <p className="mb-1 text-xs text-white/50">Payment method</p>
            <p className="mb-2 text-xs text-white/35">Record how the customer paid. No payment gateway is required; Cash is selected by default.</p>

            <div className="flex flex-wrap gap-2">
              {["CASH", "TRANSFER", "POS"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                  }}
                  className={`rounded px-3 py-2 text-sm ${
                    paymentMethod === method
                      ? "bg-orange-500 text-black"
                      : "bg-white/10"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          </div>

          <label className="block text-sm">
            Search customers {balance > 0 ? "(required for credit)" : "(optional)"}
            <input className="field mt-2 w-full" placeholder="Search by name or phone..." value={customerQuery}
              aria-label="Search customers by name or phone"
              onChange={(event) => { setCustomerQuery(event.target.value); setCustomerId(""); }} />
          </label>
          <div className="mt-2 space-y-2" aria-label="Customer search results">
            <button type="button" onClick={() => { setCustomerId(""); setCustomerQuery(""); }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${!customerId ? "border-orange-500/50 bg-orange-500/10" : "border-white/10 bg-white/5"}`}>Walk-in customer</button>
            {filteredCustomers.map((customer) => (
              <button type="button" key={customer.id} onClick={() => { setCustomerId(String(customer.id)); setCustomerQuery(customer.name); }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${customerId === String(customer.id) ? "border-orange-500/50 bg-orange-500/10" : "border-white/10 bg-white/5"}`}>
                <span className="block font-medium">{customer.name}</span><span className="block text-xs text-white/45">{customer.contact || "No phone number"}</span>
              </button>
            ))}
            {customerQuery.trim() && filteredCustomers.length === 0 && <p className="rounded-lg bg-white/5 p-3 text-sm text-white/60">No matching customer found.</p>}
            {customerQuery.trim() && filteredCustomers.length === 0 && (
              <button type="button" onClick={() => { setNewCustomerName(customerQuery.trim()); setNewCustomerContact(""); setAllowDuplicateContact(false); setError(""); setCustomerModalOpen(true); }}
                className="w-full rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-3 text-left text-sm text-orange-200">
                Create new customer: <strong>{customerQuery.trim()}</strong>
              </button>
            )}
            {customerId && <p className="text-xs text-green-300" role="status">Selected: {customers.find((customer) => String(customer.id) === customerId)?.name ?? "Customer"}</p>}
          </div>

          <button
            type="button"
            disabled={
              loading ||
              submitting ||
              cart.length === 0 ||
              !Number.isFinite(amountPaid) ||
              amountPaid < 0 ||
              amountPaid > total ||
              (balance > 0 && !customerId)
            }
            onClick={createSale}
            data-tour="sales-complete"
            className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-semibold text-black disabled:bg-white/10 disabled:text-white/30"
          >
            {submitting ? "Processing..." : "Complete sale"}
          </button>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 className="font-semibold">Sales history</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40">
              <tr>
                <th className="px-3 py-3">DATE</th>
                <th className="px-3 py-3">SALE</th>
                <th className="px-3 py-3">CUSTOMER</th>
                <th className="px-3 py-3">TOTAL</th>
                <th className="px-3 py-3">PAID</th>
                <th className="px-3 py-3">BALANCE</th>
                <th className="px-3 py-3">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-white/5">
                  <td className="px-3 py-3">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">#{sale.id}</td>
                  <td className="px-3 py-3">
                    {sale.customer_id ? `#${sale.customer_id}` : "Walk-in"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {money(Number(sale.total_amount))}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{money(Number(sale.amount_paid))}</td>
                  <td className={`px-3 py-3 whitespace-nowrap ${Number(sale.balance) > 0 ? "text-orange-300" : "text-white/50"}`}>{money(Number(sale.balance))}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void showSaleDetails(sale.id)}
                        className="rounded bg-white/10 px-2 py-1 text-xs"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void generateReceipt(sale.id)}
                        className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300"
                      >
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && sales.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-white/30"
                  >
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingCustomer) setCustomerModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-customer-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 id="create-customer-title" className="text-lg font-semibold">Create customer</h2><p className="mt-1 text-sm text-white/55">The current sale will stay as it is.</p></div>
              <button type="button" disabled={creatingCustomer} onClick={() => setCustomerModalOpen(false)} className="text-sm text-white/50 disabled:opacity-40">Close</button></div>
            <form onSubmit={createCustomer} className="mt-5 space-y-4">
              <label className="block text-sm">Customer name<input required minLength={2} autoFocus className="field mt-2 w-full" value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="e.g. Mrs Adeyemi" /></label>
              <label className="block text-sm">Phone number <span className="text-white/40">(optional)</span><input type="tel" className="field mt-2 w-full" value={newCustomerContact} onChange={(event) => { setNewCustomerContact(event.target.value); setAllowDuplicateContact(false); }} placeholder="e.g. 0803 000 0000" /></label>
              {duplicateContactCustomers.length > 0 && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                <p className="text-sm font-medium text-amber-200">This phone number is already in use.</p><p className="mt-1 text-xs text-white/60">Check whether this is the same customer before creating another record.</p>
                <div className="mt-3 space-y-2">{duplicateContactCustomers.map((customer) => <button type="button" key={customer.id} onClick={() => { setCustomerId(String(customer.id)); setCustomerQuery(customer.name); setCustomerModalOpen(false); setNewCustomerName(""); setNewCustomerContact(""); setAllowDuplicateContact(false); }} className="w-full rounded-lg bg-white/10 px-3 py-2 text-left text-sm">Use existing customer: <strong>{customer.name}</strong><span className="block text-xs text-white/50">{customer.contact}</span></button>)}</div>
                <label className="mt-3 flex items-start gap-2 text-xs text-white/75"><input type="checkbox" checked={allowDuplicateContact} onChange={(event) => setAllowDuplicateContact(event.target.checked)} className="mt-0.5" />I verified this is a different person. Create a separate customer record.</label>
              </div>}
              <div className="flex gap-3 pt-1"><button type="button" disabled={creatingCustomer} onClick={() => setCustomerModalOpen(false)} className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm">Cancel</button>
                <button type="submit" disabled={creatingCustomer || (duplicateContactCustomers.length > 0 && !allowDuplicateContact)} className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">{creatingCustomer ? "Creating..." : "Create and select"}</button></div>
            </form>
          </section>
        </div>
      )}

      {receipt && (
        <section className="sale-receipt-print mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Receipt #{receipt.sale_id}
            </h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Print receipt</button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="text-sm text-white/40"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Total"
              value={money(Number(receipt.total_amount))}
            />
            <Stat
              label="Customer"
              value={receipt.customer_id ? (customers.find((customer) => customer.id === receipt.customer_id)?.name ?? `#${receipt.customer_id}`) : "Walk-in"}
            />
            <Stat label="Amount paid" value={money(Number(receipt.amount_paid))} />
            <Stat label="Outstanding balance" value={money(Number(receipt.balance))} />
            <Stat label="Payment status" value={Number(receipt.balance) <= 0 ? "Paid" : Number(receipt.amount_paid) <= 0 ? "Unpaid" : "Partially paid"} />
            <Stat
              label="Date"
              value={new Date(receipt.created_at).toLocaleString()}
            />
          </div>

          <div className="receipt-document mt-4 rounded-xl bg-black/40 p-5 text-sm">
            <header className="receipt-header border-b border-white/15 pb-4 text-center">
              <p className="text-lg font-bold tracking-wide">{user?.store_name || "RetailOS"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">Sales receipt</p>
              <p className="mt-2 font-semibold">Receipt #{receipt.sale_id}</p>
            </header>

            <dl className="receipt-meta grid grid-cols-1 gap-x-6 gap-y-2 border-b border-white/15 py-4 sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt className="text-white/50">Date</dt><dd className="text-right">{new Date(receipt.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">Customer</dt><dd className="text-right">{receipt.customer_id ? (customers.find((customer) => customer.id === receipt.customer_id)?.name ?? `Customer #${receipt.customer_id}`) : "Walk-in customer"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">Payment method</dt><dd className="text-right">{sales.find((sale) => sale.id === receipt.sale_id)?.payment_method ?? "See payment record"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">Status</dt><dd className="text-right font-medium">{Number(receipt.balance) <= 0 ? "Paid" : Number(receipt.amount_paid) <= 0 ? "Unpaid" : "Partially paid"}</dd></div>
            </dl>

            <div className="receipt-items py-4">
              <h3 className="mb-3 font-semibold">Items purchased</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left">
                  <thead className="border-b border-white/15 text-xs text-white/50">
                    <tr><th className="pb-2 pr-3 font-medium">Item</th><th className="pb-2 px-2 text-right font-medium">Qty</th><th className="pb-2 px-2 text-right font-medium">Unit price</th><th className="pb-2 pl-2 text-right font-medium">Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, index) => {
                      const productName = products.find((product) => product.id === item.product_id)?.name ?? `Product #${item.product_id}`;
                      const quantityLabel = `${item.quantity}${item.unit_name ? ` ${item.unit_name}` : ""}`;
                      const unitPrice = item.price_at_sale != null ? Number(item.price_at_sale) : Number(item.total) / Math.max(Number(item.quantity), 1);
                      return <tr key={`${item.product_id}-${index}`} className="border-b border-white/5">
                        <td className="py-3 pr-3"><span className="font-medium">{productName}</span>{item.base_quantity_deducted != null && item.base_unit ? <span className="mt-1 block text-xs text-white/45">Stock deducted: {item.base_quantity_deducted} {item.base_unit}</span> : null}</td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">{quantityLabel}</td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">{money(unitPrice)}</td>
                        <td className="py-3 pl-2 text-right whitespace-nowrap">{money(Number(item.total))}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="receipt-totals ml-auto max-w-sm space-y-2 border-t border-white/15 pt-4">
              <div className="flex justify-between gap-4"><span className="text-white/60">Total</span><strong>{money(Number(receipt.total_amount))}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-white/60">Amount paid</span><span>{money(Number(receipt.amount_paid))}</span></div>
              <div className="flex justify-between gap-4"><span className="text-white/60">Outstanding balance</span><strong className={Number(receipt.balance) > 0 ? "text-orange-300" : ""}>{money(Number(receipt.balance))}</strong></div>
            </div>

            <footer className="receipt-footer mt-5 border-t border-white/15 pt-4 text-center text-xs text-white/50">
              <p>Thank you for your purchase.</p>
              <p className="mt-1">Please keep this receipt for your records.</p>
            </footer>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
