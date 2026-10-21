"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type { Customer } from "@/lib/types";

type HistoryRow = {
  sale_id: number;
  total_amount: string;
  created_at: string;
  items: Array<{ product_id: number; quantity: number; total: string }>;
};

export default function CustomersPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<(Customer & { purchase_history: HistoryRow[] }) | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [allowDuplicateContact, setAllowDuplicateContact] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!storeId) throw new Error("No store is associated with this account");
        const data = await api<{ customers: Customer[] }>("/customers?store_id=" + storeId);
        setCustomers(data.customers);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load customers");
      }
    }
    void load();
  }, [storeId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const id = storeId;
      if (!id) throw new Error("No store is associated with this account");
      await api("/customers", { method: "POST", json: { store_id: id, name, contact: contact || null } });
      setName("");
      setContact("");
      setMessage("Customer created.");
      const data = await api<{ customers: Customer[] }>("/customers?store_id=" + id);
      setCustomers(data.customers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create customer");
    }
  }

  function startEdit(customer: Customer) {
    setEditing(customer);
    setEditName(customer.name);
    setEditContact(customer.contact ?? "");
    setAllowDuplicateContact(false);
    setError("");
    setMessage("");
  }

  function normalizePhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("234")) return `0${digits.slice(3)}`;
    return digits;
  }

  const normalizedEditPhone = normalizePhone(editContact);
  const duplicateContactCustomers = normalizedEditPhone.length >= 7
    ? customers.filter((customer) =>
        customer.id !== editing?.id &&
        normalizePhone(customer.contact ?? "") === normalizedEditPhone,
      )
    : [];

  async function updateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const store = storeId;
    if (!store || !editing || savingEdit) return;

    const trimmedName = editName.trim();
    const trimmedContact = editContact.trim();
    if (trimmedName.length < 2) {
      setError("Customer name must contain at least 2 characters.");
      return;
    }

    const digits = normalizePhone(trimmedContact);
    if (trimmedContact && (!/^[+()\d\s.-]+$/.test(trimmedContact) || digits.length < 7 || digits.length > 15)) {
      setError("Enter a valid phone number with 7 to 15 digits, or leave it blank.");
      return;
    }
    if (duplicateContactCustomers.length > 0 && !allowDuplicateContact) {
      setError("This phone number is already assigned to another customer. Select a match or confirm that the number is shared.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{ customer: Customer }>("/customers", {
        method: "PATCH",
        json: {
          id: editing.id,
          store_id: store,
          name: trimmedName,
          contact: trimmedContact || null,
        },
      });
      const updated = data.customer;
      setCustomers((current) => current.map((customer) => customer.id === updated.id ? { ...customer, ...updated } : customer));
      setSelected((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      setEditing(null);
      setAllowDuplicateContact(false);
      setMessage("Customer details updated. Existing sales and receipts were not changed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update customer.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function history(id: number) {
    try {
      const store = storeId;
      if (!store) throw new Error("No store is associated with this account");
      const data = await api<{ customer: Customer & { purchase_history: HistoryRow[] } }>(
        "/customers/history?id=" + id + "&store_id=" + store,
      );
      setSelected(data.customer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load customer history");
    }
  }

  return (
    <DashboardShell title="Customers">
      {message && <p role="status" className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={create} data-tour="customers-form" aria-label="Add a customer" className="grid gap-3 rounded-2xl border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_1fr_auto]">
        <label className="block text-xs text-white/75">Customer name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field mt-1 text-sm" placeholder="e.g. Mrs Adeyemi" /></label>
        <label className="block text-xs text-white/75">Phone / contact (optional)<input value={contact} onChange={(e) => setContact(e.target.value)} className="field mt-1 text-sm" placeholder="e.g. 0803 000 0000" /></label>
        <button className="self-end rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black">Add customer</button>
      </form>
      <section data-tour="customers-table" className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-5">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-white/40"><tr><th className="px-3 py-3">NAME</th><th className="px-3 py-3">CONTACT</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">ACTION</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-white/5">
                <td className="px-3 py-4">{customer.name}</td><td className="px-3 py-4">{customer.contact || "—"}</td><td className="px-3 py-4">#{customer.id}</td>
                <td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => startEdit(customer)} className="rounded bg-orange-500/15 px-2 py-1 text-xs text-orange-200">Edit</button><button type="button" onClick={() => history(customer.id)} className="rounded bg-white/10 px-2 py-1 text-xs">Purchase history</button></div></td>
              </tr>
            ))}
            {!customers.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-white/70">No customers yet. Add your first customer with the form above.</td></tr>}
          </tbody>
        </table>
      </section>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEdit) setEditing(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-customer-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="edit-customer-title" className="text-lg font-semibold">Edit customer</h2><p className="mt-1 text-sm text-white/50">Update profile details only. Past sales and receipts stay unchanged.</p></div>
              <button type="button" disabled={savingEdit} onClick={() => setEditing(null)} className="text-sm text-white/50 disabled:opacity-40">Close</button>
            </div>
            <form onSubmit={updateCustomer} className="mt-5 space-y-4">
              <label className="block text-sm">Customer name
                <input required minLength={2} autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} className="field mt-2 w-full" />
              </label>
              <label className="block text-sm">Phone number <span className="text-white/40">(optional)</span>
                <input type="tel" value={editContact} onChange={(event) => { setEditContact(event.target.value); setAllowDuplicateContact(false); }} className="field mt-2 w-full" placeholder="e.g. 0803 000 0000" />
              </label>
              {editContact.trim() && normalizedEditPhone.length > 0 && normalizedEditPhone.length < 7 && <p className="text-xs text-amber-200">Phone number looks too short.</p>}
              {duplicateContactCustomers.length > 0 && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                  <p className="text-sm font-medium text-amber-200">This number is already assigned to another customer.</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/70">{duplicateContactCustomers.map((customer) => <li key={customer.id}>{customer.name} · {customer.contact}</li>)}</ul>
                  <label className="mt-3 flex items-start gap-2 text-xs text-white/75"><input type="checkbox" checked={allowDuplicateContact} onChange={(event) => setAllowDuplicateContact(event.target.checked)} className="mt-0.5" />I verified this number is shared by different people.</label>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" disabled={savingEdit} onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm">Cancel</button>
                <button type="submit" disabled={savingEdit || (duplicateContactCustomers.length > 0 && !allowDuplicateContact) || (editContact.trim().length > 0 && (normalizedEditPhone.length < 7 || normalizedEditPhone.length > 15))} className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">{savingEdit ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-orange-500/20 bg-[#151515] p-5">
          <div className="flex items-start justify-between">
            <div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-white/40">{selected.contact || "No contact"}</p></div>
            <button onClick={() => setSelected(null)} className="text-sm text-white/40">Close</button>
          </div>
          <div className="mt-5 space-y-3">
            {selected.purchase_history.map((sale) => (
              <article key={sale.sale_id} className="rounded-xl bg-white/5 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>Sale #{sale.sale_id}</span><span>₦{Number(sale.total_amount).toLocaleString()}</span><span className="text-xs text-white/35">{new Date(sale.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-white/40">{sale.items.map((item) => "Product #" + item.product_id + " × " + item.quantity).join(" • ")}</p>
              </article>
            ))}
            {!selected.purchase_history.length && <p className="text-sm text-white/30">No purchases recorded.</p>}
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
