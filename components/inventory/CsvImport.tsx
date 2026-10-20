"use client";

import { ChangeEvent, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

type CsvRow = { rowNumber: number; name: string; price: number | null; stock: number | null; sku: string; category: string; costPrice: string; errors: string[] };
type ParsedCsv = { headers: string[]; rows: CsvRow[]; unsupportedColumns: string[] };

const TEMPLATE = "Product name,Selling price,Opening stock,SKU or barcode,Category,Cost price\nBottled Water 75cl,350,30,SKU-001,Drinks,220\nInstant Noodles,450,40,SKU-002,Food,300\n";

function parseRecords(input: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field.trim()); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some((cell) => cell !== "")) records.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) records.push(row);
  return records;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
const HEADER_ALIASES: Record<string, string> = {
  "product name": "name", "name": "name", "selling price": "price", "price": "price",
  "opening stock": "stock", "stock": "stock", "quantity": "stock",
  "sku": "sku", "barcode": "sku", "sku or barcode": "sku", "category": "category",
  "cost price": "costPrice", "cost": "costPrice",
};

function parseCsv(input: string, existing: Product[]): ParsedCsv {
  const records = parseRecords(input.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new Error("Add a header row and at least one product row.");
  const originalHeaders = records[0];
  const mapped = originalHeaders.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? "");
  const required = ["name", "price", "stock"];
  const missing = required.filter((field) => !mapped.includes(field));
  if (missing.length) throw new Error("Missing required column(s): " + missing.map((x) => x === "name" ? "Product name" : x === "price" ? "Selling price" : "Opening stock").join(", ") + ".");
  const supported = new Set(["name", "price", "stock", "sku", "category", "costPrice"]);
  const unsupportedColumns = originalHeaders.filter((_, index) => !supported.has(mapped[index]));
  const usedNames = new Set<string>();
  const usedIdentifiers = new Set<string>();
  const existingNames = new Set(existing.map((product) => product.name.trim().toLocaleLowerCase()));
  const rows: CsvRow[] = records.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    mapped.forEach((key, column) => { if (key && values[key] === undefined) values[key] = cells[column] ?? ""; });
    const name = values.name ?? "";
    const priceText = values.price ?? "";
    const stockText = values.stock ?? "";
    const priceNumber = priceText === "" ? NaN : Number(priceText);
    const stockNumber = stockText === "" ? NaN : Number(stockText);
    const errors: string[] = [];
    if (!name) errors.push("Product name is required.");
    else {
      const normalized = name.toLocaleLowerCase();
      if (usedNames.has(normalized)) errors.push("Duplicate product name in this CSV.");
      else if (existingNames.has(normalized)) errors.push("A product with this name already exists in your store.");
      usedNames.add(normalized);
    }
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) errors.push("Selling price must be a number greater than 0.");
    if (!Number.isInteger(stockNumber) || stockNumber < 0) errors.push("Opening stock must be a whole number that is 0 or greater.");
    const identifier = (values.sku ?? "").trim().toLocaleLowerCase();
    if (identifier) {
      if (usedIdentifiers.has(identifier)) errors.push("Duplicate SKU/barcode in this CSV.");
      usedIdentifiers.add(identifier);
    }
    return { rowNumber: index + 2, name, price: Number.isFinite(priceNumber) ? priceNumber : null, stock: Number.isInteger(stockNumber) && stockNumber >= 0 ? stockNumber : null, sku: values.sku ?? "", category: values.category ?? "", costPrice: values.costPrice ?? "", errors };
  });
  return { headers: originalHeaders, rows, unsupportedColumns };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "retailos-product-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function CsvImport({ storeId, onImported }: { storeId: number | null; onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Monotonic counter used as a cache-busting token. It avoids the impure
  // `Date.now()` call, which React forbids during render, while still making
  // every catalogue check a distinct request.
  const requestCounter = useRef(0);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  async function fetchCatalogue(): Promise<{ products: Product[] }> {
    requestCounter.current += 1;
    return api<{ products: Product[] }>(
      "/product/list?store_id=" + storeId + "&_import_check=" + requestCounter.current,
      { refresh: true },
    );
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParsed(null); setError(""); setSummary(""); setProgress("");
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a .csv file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("CSV must be 2 MB or smaller."); return; }
    try {
      if (!storeId) throw new Error("Your account has no store attached.");
      const existingData = await fetchCatalogue();
      setParsed(parseCsv(await file.text(), existingData.products));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read this CSV.");
    }
  }

  async function importRows() {
    if (!parsed || !storeId || busy) return;
    const validRows = parsed.rows.filter((row) => row.errors.length === 0);
    if (!validRows.length) { setError("There are no valid rows to import. Correct the errors and upload the CSV again."); return; }
    setBusy(true); setError(""); setSummary(""); setProgress("");
    let imported = 0;
    let skipped = parsed.rows.length - validRows.length;
    const failures: string[] = [];
    try {
      for (let index = 0; index < validRows.length; index++) {
        const row = validRows[index];
        setProgress("Importing " + (index + 1) + " of " + validRows.length + ": " + row.name);
        try {
          // Refresh before each write. If a prior request committed but its response was lost,
          // the retry sees the product name and will not create a second copy.
          const current = await fetchCatalogue();
          const exists = current.products.some((product) => product.name.trim().toLocaleLowerCase() === row.name.trim().toLocaleLowerCase());
          if (exists) {
            skipped++;
            continue;
          }
          await api("/product/create", {
            method: "POST",
            json: { store_id: storeId, name: row.name.trim(), product_type: "Physical", base_unit: "piece", price: row.price, opening_stock: row.stock, low_stock_threshold: 0 },
          });
          imported++;
        } catch (e) {
          // A failed response can mean the server committed the write. Verify before reporting failure.
          try {
            const after = await fetchCatalogue();
            if (after.products.some((product) => product.name.trim().toLocaleLowerCase() === row.name.trim().toLocaleLowerCase())) {
              skipped++;
              continue;
            }
          } catch { /* Preserve the original error below. */ }
          failures.push("Row " + row.rowNumber + " (" + row.name + "): " + (e instanceof Error ? e.message : "request failed"));
        }
      }
      await onImported();
      const notes = [
        imported + " product(s) imported.",
        skipped + " row(s) skipped (invalid, duplicate, or already present).",
        failures.length ? failures.length + " row(s) failed and need review." : "",
        parsed.rows.some((row) => row.sku || row.category || row.costPrice) ? "SKU/barcode, category, and cost price are used for preview validation only; the current server API does not store these fields." : "",
      ].filter(Boolean);
      setSummary(notes.join(" "));
      if (failures.length) setError(failures.join("\n"));
      // Refresh preview against the new catalogue so a repeated import cannot recreate successful rows.
      const latest = await fetchCatalogue();
      setParsed((current) => current ? {
        ...current,
        rows: current.rows.map((row) => {
          if (row.errors.length) return row;
          if (latest.products.some((product) => product.name.trim().toLocaleLowerCase() === row.name.trim().toLocaleLowerCase())) {
            return { ...row, errors: ["Already present in your store; will not be imported again."] };
          }
          return row;
        }),
      } : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import stopped unexpectedly. Reload the preview before retrying.");
    } finally {
      setBusy(false); setProgress("");
    }
  }

  const validCount = parsed?.rows.filter((row) => row.errors.length === 0).length ?? 0;
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#151515] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Import products from CSV</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-white/55">Add one product manually first if you prefer. Import is optional. Download the template, preview every row, and import only valid products.</p></div>
        <button type="button" onClick={downloadTemplate} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Download CSV template</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={chooseFile} aria-label="Choose product CSV file" className="block max-w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
        {fileName && <span className="text-xs text-white/45">{fileName}</span>}
      </div>
      <p className="mt-3 text-xs leading-5 text-white/40">Required: Product name, Selling price, Opening stock. Optional columns: SKU or barcode, Category, Cost price. Current API only saves name, selling price, opening stock, and a default base unit; optional metadata is not saved.</p>
      {error && <p role="alert" className="mt-4 whitespace-pre-line rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {summary && <p role="status" className="mt-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-300">{summary}</p>}
      {progress && <p role="status" className="mt-3 text-sm text-orange-300">{progress}</p>}
      {parsed && <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-medium">Preview: {parsed.rows.length} row(s)</h3><p className="mt-1 text-sm text-white/55">{validCount} valid · {parsed.rows.length - validCount} with errors</p></div>
          <button type="button" disabled={busy || validCount === 0} onClick={importRows} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Importing…" : "Import valid rows"}</button>
        </div>
        {parsed.unsupportedColumns.length > 0 && <p className="mt-3 text-sm text-amber-300">Unrecognized columns (ignored): {parsed.unsupportedColumns.join(", ")}</p>}
        <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#202020] text-xs text-white/50"><tr><th className="px-3 py-3">ROW</th><th className="px-3 py-3">PRODUCT</th><th className="px-3 py-3">PRICE</th><th className="px-3 py-3">OPENING STOCK</th><th className="px-3 py-3">SKU / BARCODE</th><th className="px-3 py-3">VALIDATION</th></tr></thead>
            <tbody>{parsed.rows.map((row) => <tr key={row.rowNumber} className="border-t border-white/5 align-top">
              <td className="px-3 py-3 text-white/45">{row.rowNumber}</td><td className="px-3 py-3">{row.name || "—"}</td><td className="px-3 py-3">{row.price == null ? "—" : "₦" + row.price.toLocaleString("en-NG")}</td><td className="px-3 py-3">{row.stock ?? "—"}</td><td className="px-3 py-3">{row.sku || "—"}</td><td className="px-3 py-3">{row.errors.length ? <ul className="list-disc space-y-1 pl-4 text-red-300">{row.errors.map((message) => <li key={message}>{message}</li>)}</ul> : <span className="text-green-300">Valid</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {parsed.rows.some((row) => row.errors.length > 0) && <p className="mt-3 text-xs leading-5 text-white/45">Correct the CSV and upload it again to retry invalid rows. Successful or existing product names are detected before a write to reduce accidental duplicate imports.</p>}
      </>}
    </section>
  );
}
