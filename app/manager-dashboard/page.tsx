import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";

export default function ManagerDashboard() {
  return <DashboardShell role="manager" user="Jane Manager" title="Manager Dashboard">
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Alerts"><Placeholder text="No alerts right now." /></Section>
      <Section title="Performance Snapshot"><Placeholder text="Performance metrics will appear here." /></Section>
      <Section title="Reports Overview"><Placeholder text="Reports overview will appear here." /><Link href="/report" className="mt-4 inline-block text-sm font-medium text-orange-400">View Full Report →</Link></Section>
      <Section title="Recent Transactions" className="lg:col-span-2"><Table /></Section>
      <Section title="Staff Activity"><Placeholder text="Staff activity will appear here." /><Link href="/users" className="mt-4 inline-block text-sm font-medium text-orange-400">View Staff →</Link></Section>
      <Section title="Inventory Highlights"><Placeholder text="Inventory highlights will appear here." /><Link href="/inventory" className="mt-4 inline-block text-sm font-medium text-orange-400">View Inventory →</Link></Section>
    </div>
  </DashboardShell>;
}
function Section({title,children,className=""}:{title:string;children:React.ReactNode;className?:string}) { return <section className={`rounded-2xl border border-white/10 bg-[#151515] p-5 ${className}`}><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Placeholder({text}:{text:string}) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">{text}</div>; }
function Table() { return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr>{["DATE","REF","AMOUNT","STATUS"].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody><tr><td colSpan={4} className="px-3 py-10 text-center text-white/30">No transactions yet</td></tr></tbody></table></div>; }
