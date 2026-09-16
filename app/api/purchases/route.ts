import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

export async function GET() {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const result = await query("select p.id, p.supplier, p.total_cost as \"totalCost\", p.status, p.created_at as \"createdAt\", p.approved_at as \"approvedAt\" from purchases p order by p.created_at desc limit 100");
    return NextResponse.json({ purchases: result.rows });
  } catch (error) { return NextResponse.json({ error: "Unable to load purchases" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession(["ADMIN", "MANAGER"]);
    const body = await request.json();
    const supplier = String(body.supplier ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!supplier || !items.length) return NextResponse.json({ error: "Supplier and purchase items are required" }, { status: 400 });
    const purchase = await transaction(async client => {
      let total = 0; const normalized: { id: string; quantity: number; cost: number; line: number }[] = [];
      for (const item of items) {
        const id = String(item.productId ?? ""); const quantity = Number(item.quantity); const cost = Number(item.unitCost);
        if (!id || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost < 0) throw new Error("Invalid purchase item");
        const exists = await client.query("select id from products where id=$1 and active=true", [id]);
        if (!exists.rowCount) throw new Error("Product not found");
        const line = quantity * cost; total += line; normalized.push({ id, quantity, cost, line });
      }
      const created = await client.query("insert into purchases(supplier,status,total_cost,created_by) values($1,'PENDING',$2,$3) returning id,supplier,total_cost as \"totalCost\",status,created_at as \"createdAt\"", [supplier, total, user.id]);
      for (const item of normalized) await client.query("insert into purchase_items(purchase_id,product_id,quantity,unit_cost,line_total) values($1,$2,$3,$4,$5)", [created.rows[0].id, item.id, item.quantity, item.cost, item.line]);
      return created.rows[0];
    });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create purchase" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSession(["ADMIN", "MANAGER"]);
    const { id, status } = await request.json();
    if (!id || status !== "APPROVED") return NextResponse.json({ error: "Only approval is supported" }, { status: 400 });
    await transaction(async client => {
      const purchase = await client.query("select id,status from purchases where id=$1 for update", [id]);
      if (!purchase.rowCount) throw new Error("Purchase not found");
      if (purchase.rows[0].status === "APPROVED") return;
      const items = await client.query("select product_id,quantity,unit_cost from purchase_items where purchase_id=$1", [id]);
      for (const item of items.rows) {
        await client.query("update products set stock_quantity=stock_quantity+$2,cost_price=$3 where id=$1", [item.product_id, item.quantity, item.unit_cost]);
      }
      await client.query("update purchases set status='APPROVED',approved_at=now() where id=$1", [id]);
      await client.query("insert into audit_logs(user_id,action,entity,entity_id) values($1,'APPROVE','PURCHASE',$2)", [user.id, id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to approve purchase" }, { status: 400 }); }
}
