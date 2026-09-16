import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireSession();
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    const result = await query("select id, name, category, selling_price as \"sellingPrice\", cost_price as \"costPrice\", stock_quantity as \"stockQuantity\", active, created_at as \"createdAt\" from products where active=true and ($1='' or name ilike '%' || $1 || '%' or coalesce(category,'') ilike '%' || $1 || '%') order by name", [search]);
    return NextResponse.json({ products: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Unable to load products" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim() || null;
    const sellingPrice = Number(body.sellingPrice);
    const costPrice = Number(body.costPrice ?? 0);
    const stockQuantity = Number(body.stockQuantity ?? 0);
    if (!name || !Number.isFinite(sellingPrice) || sellingPrice < 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    const result = await query("insert into products(name, category, selling_price, cost_price, stock_quantity) values($1,$2,$3,$4,$5) returning id, name, category, selling_price as \"sellingPrice\", cost_price as \"costPrice\", stock_quantity as \"stockQuantity\"", [name, category, sellingPrice, costPrice, stockQuantity]);
    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to create product" : error instanceof Error ? error.message : "Forbidden" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    const result = await query("update products set name=coalesce(nullif($2,''),name), category=$3, selling_price=coalesce($4,selling_price), cost_price=coalesce($5,cost_price), stock_quantity=coalesce($6,stock_quantity) where id=$1 and active=true returning id, name, category, selling_price as \"sellingPrice\", cost_price as \"costPrice\", stock_quantity as \"stockQuantity\"", [id, body.name ? String(body.name).trim() : "", body.category ? String(body.category).trim() : null, body.sellingPrice == null ? null : Number(body.sellingPrice), body.costPrice == null ? null : Number(body.costPrice), body.stockQuantity == null ? null : Number(body.stockQuantity)]);
    if (!result.rowCount) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product: result.rows[0] });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to update product" : error instanceof Error ? error.message : "Forbidden" }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    await transaction(async client => {
      await client.query("update products set active=false where id=$1", [id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to delete product" : error instanceof Error ? error.message : "Forbidden" }, { status });
  }
}
