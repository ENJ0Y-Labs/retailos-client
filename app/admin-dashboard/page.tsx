import Link from "next/link";

const nav = ["Dashboard", "Sales", "Items", "Inventory", "Transactions", "Purchases", "Reports", "Users", "Notifications", "Settings"];

export default function AdminDashboard() {
  return <DashboardShell role="admin" user="John Admin" nav={nav}>
    <Header title="Admin Dashboard" />
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Store Health"><Placeholder text="Store health metrics coming soon." /></Section>
      <Section title="Quick Actions"><div className="grid gap-3 sm:grid-cols-3"><Action label="+ Add Sale" href="/sales" /><Action label="+ Add Purchase" href="/purchases" /><Action label="+ Admit User" href="/users" /></div></Section>
      <Section title="Recent Transactions" className="lg:col-span-2"><TransactionTable admin /></Section>
      <Section title="Activity Feed" className="lg:col-span-2"><Placeholder text="Activity feed coming soon." /></Section>
    </div>
  </DashboardShell>;
}

function DashboardShell({ children, role, user, nav }: { children: React.ReactNode; role: string; user: string; nav: string[] }) {
  return <div className="min-h-screen bg-[#0b0b0b] text-white lg:flex"><aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#111] p-5 lg:block"><p className="mb-8 text-xl font-bold">TX <span className="text-orange-500">RetailOS</span></p><nav className="space-y-1">{nav.map((item) => <Link key={item} href={item === "Dashboard" ? `/${role}-dashboard` : `/${item.toLowerCase()}`} className="block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white">{item}</Link>)}</nav></aside><main className="min-w-0 flex-1"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm text-white/40">{role}</p><p className="font-medium">{user}</p></div><button className="rounded-lg border border-white/10 px-3 py-2 text-sm">🔔</button></div><div className="p-5 md:p-8">{children}</div></main></div>;
}
function Header({ title }: { title: string }) { return <div className="mb-7"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-white/40">Overview of your retail operation.</p></div>; }
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-white/10 bg-[#151515] p-5 ${className}`}><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Placeholder({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">{text}</div>; }
function Action({ label, href }: { label: string; href: string }) { return <Link href={href} className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-orange-400">{label}</Link>; }
function TransactionTable({ admin = false }: { admin?: boolean }) { return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr>{(admin ? ["DATE", "TYPE", "REF", "AMOUNT", "STATUS"] : ["DATE", "REF", "AMOUNT", "STATUS"]).map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody><tr><td colSpan={admin ? 5 : 4} className="px-3 py-10 text-center text-white/30">No transactions yet</td></tr></tbody></table></div>; }
