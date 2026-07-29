import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  IndianRupee,
  Loader2,
  Package,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatINR } from "@/lib/menu-data";
import {
  useCategories,
  useIngredients,
  useMenuItemRows,
  useOrders,
  type OrderRow,
  type SalesSource,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Crave Cartel Admin" },
      {
        name: "description",
        content: "Revenue, orders, popular items and recent pickup activity for Crave Cartel.",
      },
      { property: "og:title", content: "Dashboard — Crave Cartel Admin" },
      { property: "og:description", content: "Kitchen performance at a glance." },
    ],
  }),
  component: Dashboard,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLE: Record<string, string> = {
  Ready: "border-veg/40 bg-veg/10 text-veg",
  Preparing: "border-gold/40 bg-gold/10 text-gold",
  Accepted: "border-gold/40 bg-gold/10 text-gold",
  Pending: "border-primary/40 bg-primary/10 text-primary",
  Completed: "border-border bg-surface-2 text-muted-foreground",
  Cancelled: "border-border bg-surface-2 text-muted-foreground",
};

function last7DaysWindow() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return start;
}

function Dashboard() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: menuRows } = useMenuItemRows();
  const { data: categories } = useCategories();
  const { data: ingredients = [] } = useIngredients();

  const lowStock = ingredients.filter((i) => Number(i.stock_qty) <= Number(i.low_threshold));
  const inventoryValue = ingredients.reduce(
    (s, i) => s + Number(i.stock_qty) * Number(i.cost_per_unit),
    0,
  );

  const sourceBreakdown = useMemo(() => {
    const map = new Map<SalesSource, number>();
    (orders ?? [])
      .filter((o) => o.status !== "Cancelled" && new Date(o.created_at) >= last7DaysWindow())
      .forEach((o) => map.set(o.source, (map.get(o.source) ?? 0) + Number(o.total)));
    return map;
  }, [orders]);

  const stats = useMemo(() => {
    const all = orders ?? [];
    const windowStart = last7DaysWindow();
    const recentWindow = all.filter(
      (o) => new Date(o.created_at) >= windowStart && o.status !== "Cancelled",
    );

    const revenue7d = recentWindow.reduce((sum, o) => sum + Number(o.total), 0);
    const orders7d = recentWindow.length;
    const avgOrder = orders7d > 0 ? revenue7d / orders7d : 0;

    const phoneCounts = new Map<string, number>();
    all.forEach((o) => phoneCounts.set(o.phone, (phoneCounts.get(o.phone) ?? 0) + 1));
    const repeatCustomers = [...phoneCounts.values()].filter((c) => c > 1).length;
    const uniqueCustomers = phoneCounts.size;
    const repeatRate =
      uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;

    const revenueByDay = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      const label = DAY_LABELS[d.getDay()];
      const dayTotal = recentWindow
        .filter((o) => new Date(o.created_at).toDateString() === d.toDateString())
        .reduce((sum, o) => sum + Number(o.total), 0);
      return { day: label, value: dayTotal };
    });

    const categoryByMenuItemId = new Map<string, string>();
    (menuRows ?? []).forEach((m) => {
      const catName = (categories ?? []).find((c) => c.id === m.category_id)?.name ?? "Other";
      categoryByMenuItemId.set(m.id, catName);
    });
    const categoryCounts = new Map<string, number>();
    all.forEach((o) =>
      o.order_items.forEach((item) => {
        const menuId = (item as { menu_item_id?: string }).menu_item_id;
        const catName = (menuId && categoryByMenuItemId.get(menuId)) || "Other";
        categoryCounts.set(catName, (categoryCounts.get(catName) ?? 0) + item.qty);
      }),
    );
    const categorySales = [...categoryCounts.entries()]
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 6);

    const itemQty = new Map<string, number>();
    all.forEach((o) =>
      o.order_items.forEach((item) =>
        itemQty.set(item.name, (itemQty.get(item.name) ?? 0) + item.qty),
      ),
    );
    const popularNames = [...itemQty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const popularItems = popularNames.map(([name, qty]) => {
      const row = (menuRows ?? []).find((m) => m.name === name);
      return {
        name,
        qty,
        price: row?.price ?? 0,
        image: row?.image_url ?? "/menu/hero-burger.jpg",
      };
    });

    const recentOrders = [...all]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    return {
      revenue7d,
      orders7d,
      avgOrder,
      repeatRate,
      revenueByDay,
      categorySales,
      popularItems,
      recentOrders,
    };
  }, [orders, menuRows, categories]);

  return (
    <AdminShell title="Dashboard" description="Live view of orders, revenue and top sellers">
      {ordersLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Revenue (7d)", value: formatINR(stats.revenue7d), icon: IndianRupee },
              { label: "Orders (7d)", value: String(stats.orders7d), icon: Receipt },
              {
                label: "Avg. order value",
                value: formatINR(Math.round(stats.avgOrder)),
                icon: TrendingUp,
              },
              { label: "Repeat customers", value: `${stats.repeatRate}%`, icon: Users },
              {
                label: "Website (7d)",
                value: formatINR(sourceBreakdown.get("website") ?? 0),
                icon: IndianRupee,
              },
              {
                label: "Swiggy (7d)",
                value: formatINR(sourceBreakdown.get("swiggy") ?? 0),
                icon: IndianRupee,
              },
              {
                label: "Zomato (7d)",
                value: formatINR(sourceBreakdown.get("zomato") ?? 0),
                icon: IndianRupee,
              },
              {
                label: "Walk-in (7d)",
                value: formatINR(sourceBreakdown.get("walkin") ?? 0),
                icon: IndianRupee,
              },
              {
                label: "Inventory value",
                value: formatINR(Math.round(inventoryValue)),
                icon: Package,
              },
              {
                label: "Low stock",
                value: String(lowStock.length),
                icon: AlertTriangle,
                accent: lowStock.length > 0,
              },
              { label: "Ingredients", value: String(ingredients.length), icon: Package },
              { label: "Menu items", value: String((menuRows ?? []).length), icon: Receipt },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={cn(
                  "card-lift rounded-2xl border p-5",
                  s.accent ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {s.label}
                  </span>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{s.value}</p>
              </motion.div>
            ))}
          </div>

          {lowStock.length > 0 && (
            <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-bold text-primary">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                Low stock:{" "}
                {lowStock
                  .slice(0, 6)
                  .map((i) => `${i.name} (${i.stock_qty}${i.unit})`)
                  .join(" · ")}
                {lowStock.length > 6 ? " …" : ""}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Revenue this week</h2>
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenueByDay} margin={{ left: -18, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        color: "var(--foreground)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#rev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Orders by category</h2>
              <div className="mt-5 h-64 w-full">
                {stats.categorySales.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No orders yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.categorySales} margin={{ left: -18, right: 8, top: 8 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--surface-2)" }}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      />
                      <Bar dataKey="orders" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-display text-lg font-bold">Recent orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Order ID</th>
                      <th className="px-5 py-3 font-semibold">Customer</th>
                      <th className="px-5 py-3 font-semibold">Items</th>
                      <th className="px-5 py-3 font-semibold">Total</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                          No orders yet
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.map((o: OrderRow) => (
                        <tr
                          key={o.id}
                          className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-surface-2/60"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                            {o.order_number}
                          </td>
                          <td className="px-5 py-3.5 font-semibold">{o.customer_name}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {o.order_items.length}
                          </td>
                          <td className="px-5 py-3.5 font-semibold tabular-nums">
                            {formatINR(o.total)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                STATUS_STYLE[o.status],
                              )}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Popular items</h2>
              {stats.popularItems.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No orders yet</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {stats.popularItems.map((m) => (
                    <li
                      key={m.name}
                      className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <img
                        src={m.image}
                        alt={m.name}
                        loading="lazy"
                        width={96}
                        height={96}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.qty} sold</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">
                        {formatINR(Number(m.price))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
