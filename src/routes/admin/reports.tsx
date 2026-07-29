import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/menu-data";
import { useOrders, type SalesSource } from "@/lib/api";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Crave Cartel Admin" },
      { name: "description", content: "Revenue trends, source breakdown and top items." },
      { property: "og:title", content: "Reports — Crave Cartel Admin" },
      { property: "og:description", content: "Business insights and exports." },
    ],
  }),
  component: ReportsPage,
});

const SOURCE_COLORS: Record<SalesSource, string> = {
  website: "var(--primary)",
  swiggy: "#FC8019",
  zomato: "#E23744",
  walkin: "#22c55e",
};

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" } as const;

function ReportsPage() {
  const { data: orders = [] } = useOrders();
  const [range, setRange] = useState<keyof typeof RANGES>("30");

  const days = Number(range);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return orders.filter((o) => new Date(o.created_at) >= cutoff && o.status !== "Cancelled");
  }, [orders, days]);

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    filtered.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(o.total));
    });
    return [...map.entries()].map(([date, revenue]) => ({ date: date.slice(5), revenue }));
  }, [filtered, days]);

  const sourceBreakdown = useMemo(() => {
    const map = new Map<SalesSource, { revenue: number; count: number }>();
    filtered.forEach((o) => {
      const cur = map.get(o.source) ?? { revenue: 0, count: 0 };
      cur.revenue += Number(o.total);
      cur.count += 1;
      map.set(o.source, cur);
    });
    return [...map.entries()].map(([source, v]) => ({ source, ...v }));
  }, [filtered]);

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    filtered.forEach((o) =>
      o.order_items.forEach((it) => {
        const cur = map.get(it.name) ?? { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * Number(it.price);
        map.set(it.name, cur);
      }),
    );
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filtered]);

  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}h`, orders: 0 }));
    filtered.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      arr[h].orders += 1;
    });
    return arr;
  }, [filtered]);

  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = filtered.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(filtered.map((o) => o.phone)).size;

  function exportCSV() {
    const rows = [
      ["Order #", "Date", "Source", "Customer", "Phone", "Total", "Items"],
      ...filtered.map((o) => [
        o.order_number,
        new Date(o.created_at).toISOString(),
        o.source,
        o.customer_name,
        o.phone,
        Number(o.total).toFixed(2),
        o.order_items.map((i) => `${i.name} x${i.qty}`).join("; "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell
      title="Reports"
      description="Sales trends, source breakdown and top sellers"
      actions={
        <div className="flex flex-wrap gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RANGES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={formatINR(totalRevenue)} />
        <Kpi label="Orders" value={String(totalOrders)} />
        <Kpi label="Avg order" value={formatINR(Math.round(avgOrder))} />
        <Kpi label="Unique customers" value={String(uniqueCustomers)} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Revenue trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyRevenue} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                fontSize={11}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={11}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue by source">
          {sourceBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sourceBreakdown}
                  dataKey="revenue"
                  nameKey="source"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {sourceBreakdown.map((s) => (
                    <Cell key={s.source} fill={SOURCE_COLORS[s.source]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINR(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card title="Orders by hour">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourly} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                fontSize={10}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={11}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="orders" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top 10 items">
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No data
                    </td>
                  </tr>
                )}
                {topItems.map((i) => (
                  <tr key={i.name} className="border-t border-border/60">
                    <td className="py-2 font-semibold">{i.name}</td>
                    <td className="py-2 text-right tabular-nums">{i.qty}</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(i.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Source detail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Avg order</th>
                <th className="px-4 py-3 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {sourceBreakdown.map((s) => (
                <tr key={s.source} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3 font-semibold capitalize">{s.source}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(s.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(Math.round(s.revenue / s.count))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {totalRevenue > 0 ? ((s.revenue / totalRevenue) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
function Empty() {
  return <div className="grid h-64 place-items-center text-sm text-muted-foreground">No data</div>;
}
