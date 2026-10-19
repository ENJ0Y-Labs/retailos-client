"use client";
<<<<<<< HEAD

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer, Product, Receipt, SaleSummary } from "@/lib/types";

type CartItem = { product: Product; quantity: number };

export default function SalesPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");

      const [p, c, s] = await Promise.all([
        api<{ products: Product[] }>("/product/list?store_id=" + id),
        api<{ customers: Customer[] }>("/customers?store_id=" + id),
        api<{ sales: SaleSummary[] }>("/sales?store_id=" + id),
      ]);

      setProducts(p.products);
      setCustomers(c.customers);
      setSales(s.sales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sales");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart]);

  function add(product: Product) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) }
          : item);
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  function change(productId: number, delta: number) {
    setCart((items) => items.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const quantity = item.quantity + delta;
      if (quantity <= 0) return [];
      return [{ ...item, quantity: Math.min(quantity, item.product.stock_quantity) }];
    }));
  }

  async function createSale() {
    if (!storeId || !cart.length) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const data = await api<{ receipt: Receipt }>("/sales", {
        method: "POST",
        json: {
          store_id: storeId,
          customer_id: customerId ? Number(customerId) : null,
          client_transaction_id: crypto.randomUUID(),
          items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        },
      });
      setReceipt(data.receipt);
      setMessage("Sale #" + data.receipt.sale_id + " completed.");
      setCart([]);
      setCustomerId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function details(id: number) {
    if (!storeId) return;
    try {
      const data = await api<{ receipt: Receipt }>("/sales/get?id=" + id + "&store_id=" + storeId);
      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sale");
    }
  }

  async function generateReceipt(id: number) {
    if (!storeId) return;
    try {
      const data = await api<{ receipt: Receipt }>("/sales/receipt", {
        method: "POST",
        json: { id, store_id: storeId },
      });
      setReceipt(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate receipt");
    }
  }

  return (
    <DashboardShell title="Sales">
      {message && <p className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">Products</h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="field max-w-sm" placeholder="Search products…" />
          </div>
          {loading ? <p className="py-12 text-center text-white/30">Loading…</p> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.id} className="rounded-xl border border-white/10 bg-[#101010] p-4">
                  <p className="text-xs text-white/35">#{product.id}</p>
                  <h3 className="mt-1 font-medium">{product.name}</h3>
                  <p className="mt-2 text-orange-400">₦{Number(product.price).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-white/35">{product.stock_quantity} in stock</p>
                  <button disabled={!product.stock_quantity} onClick={() => add(product)} className="mt-4 w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-black disabled:bg-white/10 disabled:text-white/30">
                    {product.stock_quantity ? "Add to cart" : "Out of stock"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#151515] p-5">
          <h2 className="font-semibold">Checkout</h2>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs text-white/40">Customer (optional)</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field">
              <option value="">Walk-in customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>

          <div className="mt-5 space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="rounded-lg bg-white/5 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>{item.product.name}</span>
                  <span>₦{(Number(item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => change(item.product.id, -1)} className="rounded bg-white/10 px-2">−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => change(item.product.id, 1)} className="rounded bg-white/10 px-2">+</button>
                </div>
              </div>
            ))}
            {!cart.length && <p className="py-8 text-center text-sm text-white/30">Cart is empty.</p>}
          </div>

          <div className="my-5 flex justify-between border-t border-white/10 pt-4">
            <span>Total</span><strong>₦{total.toLocaleString()}</strong>
          </div>
          <button disabled={!cart.length || submitting} onClick={createSale} className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-black disabled:bg-white/10 disabled:text-white/30">
            {submitting ? "Processing…" : "Complete sale"}
          </button>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#151515] p-5">
        <h2 className="font-semibold">Sales history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">DATE</th><th className="px-3 py-3">SALE</th><th className="px-3 py-3">CUSTOMER</th><th className="px-3 py-3">TOTAL</th><th className="px-3 py-3">ACTIONS</th></tr></thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-white/5">
                  <td className="px-3 py-3">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3">#{sale.id}</td>
                  <td className="px-3 py-3">{sale.customer_id ? "#" + sale.customer_id : "Walk-in"}</td>
                  <td className="px-3 py-3">₦{Number(sale.total_amount).toLocaleString()}</td>
                  <td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => details(sale.id)} className="rounded bg-white/10 px-2 py-1 text-xs">Details</button><button onClick={() => generateReceipt(sale.id)} className="rounded bg-orange-500/10 px-2 py-1 text-xs text-orange-300">Receipt</button></div></td>
                </tr>
              ))}
              {!sales.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-white/30">No sales yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {receipt && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Receipt #{receipt.sale_id}</h2>
            <button onClick={() => setReceipt(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total" value={"₦" + Number(receipt.total_amount).toLocaleString()} />
            <Stat label="Customer" value={receipt.customer_id ? "#" + receipt.customer_id : "Walk-in"} />
            <Stat label="Date" value={new Date(receipt.created_at).toLocaleString()} />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-white/70">{receipt.printable_text}</pre>
        </section>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
=======
import {useEffect,useMemo,useRef,useState} from "react";
type Unit={name:string;baseQuantity:number|string;price:number|string};
type Product={id:string;name:string;itemType:string;stockQuantity:number;units:Unit[];sellingPrice:number|string};
type Customer={id:string;name:string;phone:string|null};
type Cart={product:Product;unitName:string;quantity:number;price:number};
const money=(n:number)=>"₦"+n.toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2});
export default function Sales(){const [products,setProducts]=useState<Product[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[q,setQ]=useState(""),[cq,setCq]=useState(""),[customerId,setCustomerId]=useState(""),[cart,setCart]=useState<Cart[]>([]),[method,setMethod]=useState("CASH"),[paid,setPaid]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[transactionId,setTransactionId]=useState("");const checkoutLock=useRef(false);
useEffect(()=>{try{const x=localStorage.getItem("retailos-payment-method");if(x&&["CASH","TRANSFER","POS"].includes(x))setMethod(x)}catch{}},[]);
useEffect(()=>{const t=setTimeout(()=>{fetch("/api/products?search="+encodeURIComponent(q)).then(r=>r.json()).then(d=>{if(d.products)setProducts(d.products)}).catch(()=>setMsg("Unable to load items"))},200);return()=>clearTimeout(t)},[q]);
useEffect(()=>{const t=setTimeout(()=>{fetch("/api/customers?search="+encodeURIComponent(cq)).then(r=>r.json()).then(d=>{if(d.customers)setCustomers(d.customers)}).catch(()=>{})},200);return()=>clearTimeout(t)},[cq]);
const total=useMemo(()=>Math.round(cart.reduce((s,x)=>s+x.price*x.quantity,0)*100)/100,[cart]);const amount=paid===""?total:Number(paid);const balance=Math.round((total-amount)*100)/100;
function add(p:Product){const u=p.units?.[0];if(!u)return;setCart(v=>{const i=v.findIndex(x=>x.product.id===p.id&&x.unitName===u.name);if(i<0)return [...v,{product:p,unitName:u.name,quantity:1,price:Number(u.price)}];return v.map((x,j)=>j===i?{...x,quantity:x.quantity+1}:x)})}
function update(index:number,patch:Partial<Cart>){setCart(v=>v.map((x,i)=>i===index?{...x,...patch}:x))}
async function complete(){if(checkoutLock.current)return;if(!cart.length||!Number.isFinite(amount)||amount<0||amount>total||balance>0&&!customerId)return setMsg("Check amount paid and select a customer for unpaid balances");checkoutLock.current=true;setBusy(true);setMsg("");const saleTransactionId=transactionId||crypto.randomUUID();setTransactionId(saleTransactionId);try{const r=await fetch("/api/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_transaction_id:saleTransactionId,payment_method:method,amountPaid:amount,customerId:customerId||null,items:cart.map(x=>({productId:x.product.id,quantity:x.quantity,unitName:x.unitName,unitPrice:x.price}))})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Sale failed");setMsg("Sale completed: "+d.sale.receiptNo+" · Balance "+money(Number(d.sale.balance)));setCart([]);setPaid("");setTransactionId("");const rr=await fetch("/api/products");const dd=await rr.json();if(dd.products)setProducts(dd.products)}catch(e){setMsg(e instanceof Error?e.message:"Sale failed")}finally{checkoutLock.current=false;setBusy(false)}}
return <main className="p-6 text-white"><h1 className="text-2xl font-bold">Sales</h1><p role="status" className="my-3 text-orange-300">{msg}</p><div className="grid gap-6 lg:grid-cols-[1fr_420px]"><section><input className="field mb-4 w-full" placeholder="Search products or services" value={q} onChange={e=>setQ(e.target.value)}/><h2 className="mb-2 font-semibold">Quick-add services and products</h2><div className="grid gap-3 sm:grid-cols-2">{products.map(p=><button key={p.id} disabled={p.itemType!=="SERVICE"&&p.stockQuantity<=0} onClick={()=>add(p)} className="rounded-xl border border-white/20 bg-[#171717] p-4 text-left disabled:opacity-40"><strong>{p.name}</strong><p>{p.itemType==="SERVICE"?"Service · Quick add":"Product · Stock "+p.stockQuantity}</p><p className="text-orange-400">{money(Number(p.units?.[0]?.price||p.sellingPrice))}</p></button>)}</div></section><aside className="rounded-xl border border-white/20 bg-[#151515] p-4"><h2 className="mb-4 text-xl font-semibold">Cart</h2>{cart.map((x,i)=><div key={i} className="mb-4 rounded border border-white/20 p-3"><div className="flex justify-between"><strong>{x.product.name}</strong><button onClick={()=>setCart(v=>v.filter((_,j)=>j!==i))}>Remove</button></div><div className="mt-2 flex flex-wrap gap-2"><select aria-label="Selling unit" className="field" value={x.unitName} onChange={e=>{const u=x.product.units.find(u=>u.name===e.target.value);if(u)update(i,{unitName:u.name,price:Number(u.price)})}}>{x.product.units.map(u=><option key={u.name}>{u.name}</option>)}</select><button onClick={()=>update(i,{quantity:Math.max(1,x.quantity-1)})}>−</button><input aria-label="Quantity" className="field w-20" type="number" min="1" step="1" value={x.quantity} onChange={e=>update(i,{quantity:Math.max(1,Math.floor(Number(e.target.value)||1))})}/><button onClick={()=>update(i,{quantity:x.quantity+1})}>+</button></div><label className="mt-2 block text-sm">Unit price <input className="field" type="number" min="0" step=".01" value={x.price} disabled={x.product.itemType!=="SERVICE"} onChange={e=>update(i,{price:Number(e.target.value)})}/></label><p className="mt-1 text-sm">Base quantity: {Number(x.product.units.find(u=>u.name===x.unitName)?.baseQuantity||1)*x.quantity} · Line total: {money(x.price*x.quantity)}</p></div>)}<p className="font-semibold">Total: {money(total)}</p><label className="mt-3 block">Amount paid<input className="field w-full" type="number" min="0" max={total} step=".01" placeholder={String(total)} value={paid} onChange={e=>setPaid(e.target.value)}/></label><p className="my-2">Outstanding balance: {money(balance)}</p><div className="my-3 flex gap-2">{["CASH","TRANSFER","POS"].map(m=><button key={m} onClick={()=>{setMethod(m);try{localStorage.setItem("retailos-payment-method",m)}catch{}}} className={"rounded px-3 py-2 "+(method===m?"bg-orange-500 text-black":"bg-white/10")}>{m}</button>)}</div><label className="block">Customer {balance>0?"(required)":""}<input className="field mt-2 w-full" placeholder="Search customers" value={cq} onChange={e=>{setCq(e.target.value);setCustomerId("")}}/></label><select aria-label="Select customer" className="field mt-2 w-full" value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">No customer selected</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} {c.phone||""}</option>)}</select><button disabled={busy||!cart.length||balance>0&&!customerId} onClick={complete} className="mt-4 w-full rounded bg-orange-500 p-3 font-semibold text-black disabled:opacity-40">{busy?"Processing...":"Complete Sale"}</button></aside></div></main>}
>>>>>>> 0b8d836 (fix(sales): use server client transaction id contract)
