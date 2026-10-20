"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DemoProduct = { id: number; name: string; category: string; price: number; initialStock: number; stock: number };
type CartLine = { productId: number; quantity: number };

const SEED_PRODUCTS: DemoProduct[] = [
  { id: 1, name: "Bottled Water 75cl", category: "Drinks", price: 350, initialStock: 30, stock: 30 },
  { id: 2, name: "Cola Drink 50cl", category: "Drinks", price: 500, initialStock: 24, stock: 24 },
  { id: 3, name: "Orange Juice 50cl", category: "Drinks", price: 700, initialStock: 18, stock: 18 },
  { id: 4, name: "Instant Noodles", category: "Food", price: 450, initialStock: 40, stock: 40 },
  { id: 5, name: "Long Grain Rice 1kg", category: "Food", price: 2200, initialStock: 15, stock: 15 },
  { id: 6, name: "Spaghetti 500g", category: "Food", price: 1200, initialStock: 20, stock: 20 },
  { id: 7, name: "Loaf of Bread", category: "Food", price: 1000, initialStock: 12, stock: 12 },
  { id: 8, name: "Milk Powder Sachet", category: "Groceries", price: 250, initialStock: 35, stock: 35 },
  { id: 9, name: "Laundry Soap", category: "Household", price: 600, initialStock: 22, stock: 22 },
  { id: 10, name: "Bathing Soap", category: "Personal care", price: 550, initialStock: 25, stock: 25 },
  { id: 11, name: "Toothpaste", category: "Personal care", price: 900, initialStock: 16, stock: 16 },
  { id: 12, name: "Cooking Oil 1L", category: "Groceries", price: 3200, initialStock: 10, stock: 10 },
];

const money = (amount: number) => "₦" + amount.toLocaleString("en-NG");

export default function DemoPage() {
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sales, setSales] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.category.toLowerCase().includes(query.toLowerCase()),
  );
  const total = useMemo(
    () => cart.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product?.price ?? 0) * line.quantity;
    }, 0),
    [cart, products],
  );

  function addToCart(product: DemoProduct) {
    setMessage("");
    if (product.stock < 1) return;
    setCart((current) => {
      const line = current.find((item) => item.productId === product.id);
      if (line) {
        if (line.quantity >= product.stock) return current;
        return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
  }

  function changeQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      setCart((current) => current.filter((line) => line.productId !== productId));
      return;
    }
    const product = products.find((item) => item.id === productId);
    if (!product || quantity > product.stock) return;
    setCart((current) => current.map((line) => line.productId === productId ? { ...line, quantity } : line));
  }

  function completeDemoSale() {
    if (!cart.length) {
      setMessage("Add at least one product to try a demo sale.");
      return;
    }
    const invalid = cart.some((line) => {
      const product = products.find((item) => item.id === line.productId);
      return !product || line.quantity > product.stock;
    });
    if (invalid) {
      setMessage("A cart quantity exceeds the available demo stock. Update the cart and retry.");
      return;
    }
    setProducts((current) => current.map((product) => {
      const line = cart.find((item) => item.productId === product.id);
      return line ? { ...product, stock: product.stock - line.quantity } : product;
    }));
    setSales((current) => current + 1);
    setRevenue((current) => current + total);
    setCart([]);
    setMessage("Demo sale completed. No real sale, inventory, or financial record was created.");
  }

  function resetDemo() {
    setProducts(SEED_PRODUCTS.map((product) => ({ ...product })));
    setCart([]);
    setSales(0);
    setRevenue(0);
    setQuery("");
    setMessage("Demo reset. Sample products and stock have been restored.");
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold">TX <span className="text-orange-500">RetailOS</span></Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300">DEMO SHOP</span>
            <Link href="/register" className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black">Create account</Link>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/[0.07] p-5">
          <h1 className="text-2xl font-semibold sm:text-3xl">Try a sale in your demo shop</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">Explore a sample provision-store catalogue, add items to the cart, and complete a pretend cash sale. This sandbox runs only in this page's memory. It does not call the RetailOS API or change real store records.</p>
        </section>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Demo products" value={String(products.length)} />
          <Stat label="Demo sales" value={String(sales)} />
          <Stat label="Demo revenue" value={money(revenue)} />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Sample products</h2><p className="mt-1 text-sm text-white/55">Select an item to add it to the demo cart.</p></div>
              <input aria-label="Search demo products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" className="field max-w-xs" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.id} className="flex flex-col rounded-xl border border-white/10 bg-black/20 p-4">
                  <span className="text-xs text-orange-300">{product.category} · Demo</span>
                  <h3 className="mt-2 font-medium">{product.name}</h3>
                  <p className="mt-2 text-lg font-semibold">{money(product.price)}</p>
                  <p className="mt-1 text-xs text-white/55">Demo stock: {product.stock}</p>
                  <button type="button" disabled={product.stock === 0} onClick={() => addToCart(product)} className="mt-4 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
                    {product.stock === 0 ? "Out of demo stock" : "Add to cart"}
                  </button>
                </article>
              ))}
              {filtered.length === 0 && <p className="text-sm text-white/60">No demo products match that search.</p>}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#141414] p-5 lg:sticky lg:top-5">
            <h2 className="text-lg font-semibold">Demo checkout</h2>
            <p className="mt-1 text-sm text-white/55">Payment: cash (simulated)</p>
            <div className="mt-4 space-y-3">
              {cart.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return <div key={line.productId} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="min-w-0"><p className="text-sm font-medium">{product.name}</p><p className="text-xs text-white/55">{money(product.price)} each</p></div>
                  <div className="flex items-center gap-2">
                    <button aria-label={"Decrease " + product.name} onClick={() => changeQuantity(product.id, line.quantity - 1)} className="h-8 w-8 rounded-md border border-white/20">−</button>
                    <span className="min-w-4 text-center text-sm">{line.quantity}</span>
                    <button aria-label={"Increase " + product.name} disabled={line.quantity >= product.stock} onClick={() => changeQuantity(product.id, line.quantity + 1)} className="h-8 w-8 rounded-md border border-white/20 disabled:opacity-40">+</button>
                  </div>
                </div>;
              })}
              {!cart.length && <p className="rounded-lg bg-white/5 p-4 text-sm text-white/55">Your demo cart is empty. Add a product to try checkout.</p>}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-sm text-white/65">Total</span><strong className="text-xl">{money(total)}</strong></div>
            <button type="button" onClick={completeDemoSale} disabled={!cart.length} className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black disabled:opacity-40">Complete demo sale</button>
            {message && <p role="status" className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/75">{message}</p>}
            <button type="button" onClick={resetDemo} className="mt-3 w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/5">Reset demo shop</button>
            <p className="mt-4 text-xs leading-5 text-white/45">Demo-only figures. Reloading this page also resets the demo. No payment is processed and no real inventory or reports are affected.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#141414] p-4"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
