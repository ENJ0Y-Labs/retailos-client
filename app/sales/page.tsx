
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer, Product, Receipt, SaleSummary } from "@/lib/types";

type Unit = {
  name: string;
  baseQuantity: number | string;
  price: number | string;
};

type SalesProduct = Product & {
  itemType?: string;
  stockQuantity?: number;
  units?: Unit[];
  sellingPrice?: number | string;
};

type CartItem = {
  product: SalesProduct;
  unitName: string;
  quantity: number;
  price: number;
};

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
    try {
      const savedMethod = localStorage.getItem("retailos-payment-method");

      if (
        savedMethod &&
        ["CASH", "TRANSFER", "POS"].includes(savedMethod)
      ) {
        setPaymentMethod(savedMethod);
      }

      const pendingId = localStorage.getItem("retailos-pending-sale-id");

      if (pendingId) {
        setTransactionId(pendingId);
      }
    } catch {
      // Storage may be unavailable in restricted browser environments.
    }
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
    void load();
  }, [load]);

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
    return Number(product.stockQuantity ?? product.stock_quantity ?? 0);
  }

  function unitsFor(product: SalesProduct): Unit[] {
    if (product.units?.length) {
      return product.units;
    }

    // Compatibility fallback for products using the original data model.
    return [
      {
        name: "Unit",
        baseQuantity: 1,
        price: product.price,
      },
    ];
  }

  function addProduct(product: SalesProduct) {
    const unit = unitsFor(product)[0];

    if (!unit) {
      setError(`No selling unit is configured for ${product.name}.`);
      return;
    }

    const isService = product.itemType === "SERVICE";
    const stock = stockFor(product);

    setError("");

    setCart((items) => {
      const index = items.findIndex(
        (item) =>
          item.product.id === product.id && item.unitName === unit.name,
      );

      const existingQuantity =
        index >= 0 ? items[index].quantity : 0;

      const nextQuantity = existingQuantity + 1;

      if (!isService && nextQuantity * Number(unit.baseQuantity) > stock) {
        setError(`Insufficient stock for ${product.name}.`);
        return items;
      }

      if (index < 0) {
        return [
          ...items,
          {
            product,
            unitName: unit.name,
            quantity: 1,
            price: Number(unit.price),
          },
        ];
      }

      return items.map((item, i) =>
        i === index ? { ...item, quantity: nextQuantity } : item,
      );
    });
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCart((items) =>
      items.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, ...patch };
        const isService = updated.product.itemType === "SERVICE";

        if (!Number.isInteger(updated.quantity) || updated.quantity < 1) {
          return item;
        }

        if (!Number.isFinite(updated.price) || updated.price < 0) {
          return item;
        }

        if (!isService) {
          const unit = unitsFor(updated.product).find(
            (candidate) => candidate.name === updated.unitName,
          );

          const requiredStock =
            updated.quantity * Number(unit?.baseQuantity ?? 1);

          if (requiredStock > stockFor(updated.product)) {
            setError(`Insufficient stock for ${updated.product.name}.`);
            return item;
          }
        }

        return updated;
      }),
    );

    setError("");
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
          payment_method: paymentMethod,
          amountPaid,
          items: cart.map((item) => ({
            product_id: item.product.id,
            productId: item.product.id,
            quantity: item.quantity,
            unitName: item.unitName,
            unitPrice: item.price,
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

      setError(e instanceof Error ? e.message : "Unable to complete sale.");
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
              placeholder="Search products or services..."
            />
          </div>

          {loading ? (
            <p className="py-12 text-center text-white/30">Loading...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="py-12 text-center text-white/30">
              No matching products or services.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const isService = product.itemType === "SERVICE";
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
                      {isService ? "Service" : `${stock} base units in stock`}
                    </p>

                    <p className="mt-2 text-orange-400">
                      {money(Number(firstUnit?.price ?? product.price))}
                    </p>

                    <button
                      disabled={!isService && stock <= 0}
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

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="text-lg font-semibold">Checkout</h2>

          <div className="mt-5 space-y-3">
            {cart.map((item, index) => {
              const units = unitsFor(item.product);
              const selectedUnit = units.find(
                (unit) => unit.name === item.unitName,
              );
              const baseQuantity =
                Number(selectedUnit?.baseQuantity ?? 1) * item.quantity;

              return (
                <div
                  key={`${item.product.id}-${item.unitName}`}
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
                      value={item.unitName}
                      onChange={(event) => {
                        const unit = units.find(
                          (candidate) => candidate.name === event.target.value,
                        );

                        if (unit) {
                          updateCartItem(index, {
                            unitName: unit.name,
                            price: Number(unit.price),
                          });
                        }
                      }}
                      className="field mt-1 w-full"
                    >
                      {units.map((unit) => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name}
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
                      disabled={item.product.itemType !== "SERVICE"}
                      onChange={(event) =>
                        updateCartItem(index, {
                          price: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <p className="mt-2 text-xs text-white/50">
                    Base quantity: {baseQuantity}
                  </p>

                  <p className="mt-1">
                    Line total: {money(item.price * item.quantity)}
                  </p>
                </div>
              );
            })}

            {cart.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">
                Cart is empty.
              </p>
            )}
          </div>

          <div className="my-5 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>

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
            <p className="mb-2 text-xs text-white/50">Payment method</p>

            <div className="flex flex-wrap gap-2">
              {["CASH", "TRANSFER", "POS"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);

                    try {
                      localStorage.setItem("retailos-payment-method", method);
                    } catch {
                      // Payment method remains selected in component state.
                    }
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

          <label className="block text-sm">
            Search customers {balance > 0 ? "(required for credit)" : "(optional)"}
            <input
              className="field mt-2 w-full"
              placeholder="Search customers..."
              value={customerQuery}
              onChange={(event) => {
                setCustomerQuery(event.target.value);
                setCustomerId("");
              }}
            />
          </label>

          <select
            aria-label="Select customer"
            className="field mt-2 w-full"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Walk-in customer</option>
            {customers
              .filter((customer) =>
                customer.name
                  .toLowerCase()
                  .includes(customerQuery.toLowerCase()),
              )
              .map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {"phone" in customer && customer.phone
                    ? ` (${customer.phone})`
                    : ""}
                </option>
              ))}
          </select>

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
                  <td className="px-3 py-3">
                    {money(Number(sale.total_amount))}
                  </td>
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
                    colSpan={5}
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

      {receipt && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Receipt #{receipt.sale_id}
            </h2>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="text-sm text-white/40"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Total"
              value={money(Number(receipt.total_amount))}
            />
            <Stat
              label="Customer"
              value={receipt.customer_id ? `#${receipt.customer_id}` : "Walk-in"}
            />
            <Stat
              label="Date"
              value={new Date(receipt.created_at).toLocaleString()}
            />
          </div>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-white/70">
            {receipt.printable_text}
          </pre>
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
