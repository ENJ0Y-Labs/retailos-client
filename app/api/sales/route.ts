import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

function receiptNo() { return `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

export async function GET(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER", "EMPLOYEE"]);
    const p = new URL(request.url).searchParams;
    const search = p.get("search")?.trim() ?? "";
    const status = p.get("status")?.trim() ?? "";
    const payment = p.get("payment")?.trim() ?? "";
    const result = await query("select s.id, s.receipt_no as \"receiptNo\", s.total_amount as \"totalAmount\", s.payment, s.status, s.created_at as \"createdAt\", u.full_name as \"employeeName\" from sales s join users u on u.id=s.employee_id where ($1='' or s.receipt_no ilike '%'||$1||'%') and ($2='' or s.status::text=$2) and ($3='' or s.payment::text=$3) order by s.created_at desc limit 100", [search, status, payment]);
    return NextResponse.json({ sales: result.rows });
  } catch (error) { return NextResponse.json({ error: "Unable to load sales" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession(["ADMIN", "MANAGER", "EMPLOYEE"]);
    const body = await request.json();
    const payment = String(body.payment ?? "").toUpperCase();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!["CASH", "TRANSFER", "POS"].includes(payment) || !items.length) return NextResponse.json({ error: "Payment method and cart items are required" }, { status: 400 });

    const sale = await transaction(async client => {
      const receipt = receiptNo();
      let total = 0;
      let totalCost = 0;
      const normalized: { id: string; quantity: number; price: number; cost: number; line: number }[] = [];
      for (const item of items) {
        const id = String(item.productId ?? "");
        const quantity = Number(item.quantity);
        if (!id || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid sale item");
        const product = await client.query("select selling_price, cost_price, stock_quantity from products where id=$1 and active=true for update", [id]);
        if (!product.rowCount) throw new Error("Product not found");
        const p = product.rows[0];
        if (p.stock_quantity < quantity) throw new Error(`Insufficient stock for product ${id}`);
        const price = Number(p.selling_price); const cost = Number(p.cost_price); const line = price * quantity;
        total += line; totalCost += cost * quantity; normalized.push({ id, quantity, price, cost, line });
      }
      const created = await client.query("insert into sales(receipt_no,employee_id,payment,status,total_amount,total_cost) values($1,$2,$3,'COMPLETED',$4,$5) returning id, receipt_no as \"receiptNo\", total_amount as \"totalAmount\", payment, status, created_at as \"createdAt\"", [receipt, user.id, payment, total, totalCost]);
      for (const item of normalized) {
        await client.query("insert into sale_items(sale_id,product_id,quantity,unit_price,unit_cost,line_total) values($1,$2,$3,$4,$5,$6)", [created.rows[0].id, item.id, item.quantity, item.price, item.cost, item.line]);
        await client.query("update products set stock_quantity=stock_quantity-$2 where id=$1", [item.id, item.quantity]);
      }
      await client.query("insert into audit_logs(user_id,action,entity,entity_id,details) values($1,'CREATE','SALE',$2,$3)", [user.id, created.rows[0].id, JSON.stringify({ receiptNo: receipt, total })]);
      return created.rows[0];
    });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete sale";
    const status = message === "UNAUTHORIZED" || message === "FORBIDDEN" ? 401 : message.includes("Insufficient") || message.includes("required") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSession(["ADMIN", "MANAGER"]);
    const { id } = await request.json();
    await transaction(async client => {
      const sale = await client.query("select id,status from sales where id=$1 for update", [id]);
      if (!sale.rowCount) throw new Error("Sale not found");
      if (sale.rows[0].status === "CANCELLED") return;
      const items = await client.query("select product_id,quantity from sale_items where sale_id=$1", [id]);
      for (const item of items.rows) await client.query("update products set stock_quantity=stock_quantity+$2 where id=$1", [item.product_id, item.quantity]);
      await client.query("update sales set status='CANCELLED' where id=$1", [id]);
      await client.query("insert into audit_logs(user_id,action,entity,entity_id) values($1,'CANCEL','SALE',$2)", [user.id, id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel sale" }, { status: 400 }); }
}
