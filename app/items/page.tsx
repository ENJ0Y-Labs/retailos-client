"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Category, Product } from "@/lib/types";

export default function ItemsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setProductsLoading(true);
      setCategoriesLoading(true);
      setError("");
      setCategoryError("");
      try {
        const storeId = user?.store_id;
        if (!storeId) throw new Error("No store is associated with this account");
        const [productResult, categoryResult] = await Promise.allSettled([
          api<{ products: Product[] }>("/product/list?store_id=" + storeId, { refresh: true }),
          api<{ categories: Category[] }>("/categories?store_id=" + storeId, { refresh: true }),
        ]);
        if (!active) return;

        if (productResult.status === "fulfilled") {
          setProducts(productResult.value.products);
        } else {
          setProducts([]);
          setError(productResult.reason instanceof Error ? productResult.reason.message : "Unable to load products");
        }

        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value.categories);
          const saved = window.sessionStorage.getItem("retailos:items:selected-category:" + storeId);
          setSelectedCategoryId(
            saved && (saved === "all" || categoryResult.value.categories.some((category) => String(category.id) === saved))
              ? saved
              : "all",
          );
        } else {
          setCategories([]);
          setSelectedCategoryId("all");
          setCategoryError(categoryResult.reason instanceof Error ? categoryResult.reason.message : "Unable to load categories");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load products");
      } finally {
        if (active) {
          setProductsLoading(false);
          setCategoriesLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user?.store_id]);

  async function viewProduct(id: number) {
    try {
      const storeId = user?.store_id;
      if (!storeId) throw new Error("No store is associated with this account");
      const data = await api<{ product: Product }>(
        "/product/get?id=" + id + "&store_id=" + storeId,
      );
      setSelected(data.product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load product");
    }
  }

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()) &&
    (selectedCategoryId === "all" || String(product.category_id ?? "") === selectedCategoryId),
  );

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    const storeId = user?.store_id;
    if (storeId) {
      window.sessionStorage.setItem("retailos:items:selected-category:" + storeId, categoryId);
    }
  }

  return (
    <DashboardShell title="Products & Services">
      {error && <p className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} className="field mb-4 max-w-xl" placeholder="Search products and services…" />

      <div className="mb-5">
        <div role="tablist" aria-label="Filter products and services by category" className="flex max-w-full gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategoryId === "all"}
            onClick={() => selectCategory("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${selectedCategoryId === "all" ? "bg-orange-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
          >
            All
          </button>
          {categories.map((category) => {
            const duplicateName = categories.some(
              (other) => other.id !== category.id && other.name.toLocaleLowerCase() === category.name.toLocaleLowerCase(),
            );
            const label = duplicateName
              ? category.name + (category.item_type === "Physical" ? " · Products" : " · Services")
              : category.name;
            const selectedCategory = selectedCategoryId === String(category.id);
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory}
                onClick={() => selectCategory(String(category.id))}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${selectedCategory ? "bg-orange-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {categoriesLoading && <p role="status" className="mt-2 text-xs text-white/50">Loading categories…</p>}
        {!categoriesLoading && categoryError && (
          <p role="alert" className="mt-2 text-xs text-red-300">Categories could not be loaded: {categoryError}. The All tab remains available.</p>
        )}
        {!categoriesLoading && !categoryError && categories.length === 0 && (
          <p className="mt-2 text-xs text-white/45">No categories yet. Items without a category remain available under All.</p>
        )}
      </div>

      {productsLoading ? (
        <div role="status" className="rounded-2xl border border-white/10 bg-[#151515] p-10 text-center text-white/50">Loading products and services…</div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => (
          <article key={product.id} className="rounded-2xl border border-white/10 bg-[#151515] p-5">
            <p className="text-xs text-white/35">{product.product_type === "Service" ? "Service" : "Product"} #{product.id}</p>
            <h2 className="mt-2 font-semibold">{product.name}</h2>
            <p className="mt-2 text-lg text-orange-400">₦{Number(product.price).toLocaleString()}</p>
            <p className="mt-1 text-xs text-white/45">{product.product_type === "Service" ? "Service" : "Product"}</p>
            {product.product_type === "Physical" && <p className="mt-1 text-sm text-white/40">{product.stock_quantity} {product.base_unit} in stock</p>}
            <button onClick={() => viewProduct(product.id)} className="mt-5 rounded-lg bg-white/10 px-3 py-2 text-sm">
              View details
            </button>
          </article>
        ))}
      </div>
      )}

      {!productsLoading && !error && !filtered.length && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-10 text-center text-white/50">
          {selectedCategoryId === "all" ? "No products or services found." : "No products or services are assigned to this category."}
        </div>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-white/40">Product #{selected.id}</p><h2 className="mt-1 text-lg font-semibold">{selected.name}</h2></div>
            <button onClick={() => setSelected(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Price" value={"₦" + Number(selected.price).toLocaleString()} />
            <Stat label="Stock" value={selected.stock_quantity} />
            <Stat label="Low-stock threshold" value={selected.low_stock_threshold ?? "—"} />
          </div>
        </section>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-white/40">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
