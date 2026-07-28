import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/menu-data";
import {
  ORDER_STATUSES,
  useArchiveCompletedOrders,
  useOrders,
  useUpdateOrderStatus,
  type OrderRow,
  type OrderStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Crave Cartel Admin" },
      {
        name: "description",
        content: "Track incoming WhatsApp pickup orders, payment state and kitchen status.",
      },
      { property: "og:title", content: "Orders — Crave Cartel Admin" },
      { property: "og:description", content: "Live pickup order queue for the kitchen team." },
    ],
  }),
  component: OrdersPage,
});

const TABS = ["All", ...ORDER_STATUSES] as const;

const STATUS_STYLE: Record<OrderStatus, string> = {
  Pending: "border-primary/40 bg-primary/10 text-primary",
  Accepted: "border-gold/40 bg-gold/10 text-gold",
  Preparing: "border-gold/40 bg-gold/10 text-gold",
  Ready: "border-veg/40 bg-veg/10 text-veg",
  Completed: "border-border bg-surface-2 text-muted-foreground",
  Cancelled: "border-border bg-surface-2 text-muted-foreground line-through",
};

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const archiveOrders = useArchiveCompletedOrders();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<OrderRow | null>(null);

  const rows = (orders ?? []).filter(
    (o) =>
      (tab === "All" || o.status === tab) &&
      (!q ||
        o.customer_name.toLowerCase().includes(q.toLowerCase()) ||
        o.order_number.toLowerCase().includes(q.toLowerCase())),
  );

  function handleStatusChange(order: OrderRow, status: OrderStatus) {
    updateStatus.mutate(
      { id: order.id, status },
      {
        onSuccess: () => {
          toast.success(`${order.order_number} marked ${status}`);
          setViewing((prev) => (prev && prev.id === order.id ? { ...prev, status } : prev));
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update order"),
      },
    );
  }

  function handleDownloadReport() {
    const now = new Date();
    const monthly = (orders ?? []).filter((o) => {
      const d = new Date(o.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    if (monthly.length === 0) {
      toast.error("No orders for this month yet");
      return;
    }

    const header = [
      "Order Date",
      "Order ID",
      "Customer Name",
      "Phone",
      "Items",
      "Order Type",
      "Payment Method",
      "Total",
      "Status",
    ];

    const body = monthly.map((o) =>
      [
        new Date(o.created_at).toLocaleString(),
        o.order_number,
        o.customer_name,
        o.phone,
        o.order_items.map((i) => `${i.qty} x ${i.name}`).join("; "),
        o.order_type === "delivery" ? "Delivery" : "Take Away",
        o.payment_method,
        Number(o.total).toFixed(2),
        o.status,
      ]
        .map(csvCell)
        .join(","),
    );

    const csv = [header.map(csvCell).join(","), ...body].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${monthly.length} orders`);
  }

  function handleArchive() {
    const completed = (orders ?? []).filter((o) => o.status === "Completed").length;
    if (completed === 0) {
      toast.error("No completed orders to archive");
      return;
    }
    archiveOrders.mutate(undefined, {
      onSuccess: (moved) => toast.success(`${moved} completed orders moved to the archive`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to archive orders"),
    });
  }

  return (
    <AdminShell title="Orders" description="Every WhatsApp pickup order in one queue">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order ID or customer"
            className="h-11 rounded-xl border-border bg-surface pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghostline" size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4" />
            Download Monthly Report
          </Button>
          <Button
            variant="ghostline"
            size="sm"
            disabled={archiveOrders.isPending}
            onClick={handleArchive}
          >
            {archiveOrders.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive Orders
          </Button>
        </div>
      </div>

      <div className="mt-3 no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="grid place-items-center px-6 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-bold">No orders here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing matches this filter right now.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {[
                    "Order ID",
                    "Customer",
                    "Pickup",
                    "Items",
                    "Total",
                    "Payment",
                    "Status",
                    "",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-surface-2/60"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {o.order_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{o.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{o.pickup_time}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{o.order_items.length}</td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{formatINR(o.total)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{o.payment_method}</td>
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
                    <td className="px-5 py-3.5">
                      <Button variant="ghostline" size="sm" onClick={() => setViewing(o)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-extrabold">
                  {viewing.order_number}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Placed {new Date(viewing.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer
                    </p>
                    <p className="font-semibold">{viewing.customer_name}</p>
                    <p className="text-muted-foreground">{viewing.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pickup
                    </p>
                    <p className="font-semibold">{viewing.pickup_time}</p>
                    <p className="text-muted-foreground">{viewing.payment_method}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {viewing.order_type === "delivery" ? "Delivery" : "Take Away"}
                    </p>
                    <p className="text-muted-foreground">
                      {viewing.order_type === "delivery"
                        ? (viewing.delivery_address ?? "No address provided")
                        : "Collecting from the counter"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Items
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {viewing.order_items.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {i.qty} × {i.name}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatINR(i.price * i.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
                    <span>Total</span>
                    <span>{formatINR(viewing.total)}</span>
                  </div>
                </div>

                {viewing.special_instructions && (
                  <div className="rounded-2xl border border-primary/25 bg-primary/8 p-4 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Special instructions
                    </p>
                    {viewing.special_instructions}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Update status
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {ORDER_STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={updateStatus.isPending}
                        onClick={() => handleStatusChange(viewing, s)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-300",
                          viewing.status === s
                            ? "border-primary bg-primary/12 text-primary"
                            : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
