import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Download, FileSpreadsheet, Lock, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/menu-data";
import {
  lastNMonths,
  monthLabel,
  useBusinessCycles,
  useCloseMonth,
  useDeleteMonthlyReport,
  useMonthlyReports,
  useSalesSummary,
  type MonthlyReportRow,
} from "@/lib/management";
import { exportCSV, exportExcel, printDocument, stamp, type Column } from "@/lib/exporters";

export const Route = createFileRoute("/admin/monthly")({
  head: () => ({
    meta: [
      { title: "Monthly Cycle — Crave Cartel Admin" },
      {
        name: "description",
        content: "Close the business month and browse archived monthly reports.",
      },
      { property: "og:title", content: "Monthly Cycle — Crave Cartel Admin" },
      { property: "og:description", content: "Month-end closing and report archive." },
    ],
  }),
  component: MonthlyPage,
});

function monthRange(monthIso: string) {
  const d = new Date(monthIso);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end) };
}

function MonthlyPage() {
  const months = useMemo(() => lastNMonths(18), []);
  const [selected, setSelected] = useState(months[0]);
  const { from, to } = monthRange(selected);

  const { data: cycles = [] } = useBusinessCycles();
  const { data: reports = [] } = useMonthlyReports();
  const { data: live } = useSalesSummary(from, to);
  const closeMonth = useCloseMonth();
  const removeReport = useDeleteMonthlyReport();

  const cycle = cycles.find((c) => c.month.slice(0, 7) === selected.slice(0, 7));
  const isClosed = cycle?.status === "closed";

  async function handleClose() {
    try {
      await closeMonth.mutateAsync(selected);
      toast.success(`${monthLabel(selected)} closed and archived`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const archiveColumns: Column<MonthlyReportRow>[] = [
    { header: "Month", value: (r) => monthLabel(r.month) },
    { header: "Revenue", value: (r) => Number(r.revenue), align: "right" },
    { header: "Orders", value: (r) => r.orders_count, align: "right" },
    { header: "Items sold", value: (r) => r.items_sold, align: "right" },
    { header: "COGS", value: (r) => Number(r.cogs), align: "right" },
    { header: "Gross profit", value: (r) => Number(r.gross_profit), align: "right" },
    {
      header: "Margin %",
      value: (r) =>
        Number(r.revenue) > 0
          ? ((Number(r.gross_profit) / Number(r.revenue)) * 100).toFixed(1)
          : "0.0",
      align: "right",
    },
    { header: "Avg order", value: (r) => Number(r.avg_order_value), align: "right" },
  ];

  const archiveTotals = reports.reduce(
    (acc, r) => ({
      revenue: acc.revenue + Number(r.revenue),
      orders: acc.orders + r.orders_count,
      cogs: acc.cogs + Number(r.cogs),
      profit: acc.profit + Number(r.gross_profit),
    }),
    { revenue: 0, orders: 0, cogs: 0, profit: 0 },
  );

  return (
    <AdminShell
      title="Monthly Cycle"
      description="Close the business month, archive the numbers and reopen a clean slate"
      actions={
        <div className="flex flex-wrap gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleClose} disabled={closeMonth.isPending}>
            <Lock className="mr-2 h-4 w-4" />
            {closeMonth.isPending ? "Closing…" : isClosed ? "Re-close month" : "Close month"}
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">{monthLabel(selected)}</h2>
          </div>
          <span
            className={
              "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider " +
              (isClosed
                ? "border-border bg-surface-2 text-muted-foreground"
                : "border-veg/40 bg-veg/10 text-veg")
            }
          >
            {isClosed ? "Closed" : "Open"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi label="Revenue" value={formatINR(Number(live?.revenue ?? 0))} />
          <Kpi label="Orders" value={String(live?.orders_count ?? 0)} />
          <Kpi label="Items sold" value={String(live?.items_sold ?? 0)} />
          <Kpi label="COGS" value={formatINR(Number(live?.cogs ?? 0))} />
          <Kpi label="Gross profit" value={formatINR(Number(live?.gross_profit ?? 0))} />
          <Kpi
            label="Margin"
            value={
              Number(live?.revenue ?? 0) > 0
                ? `${((Number(live?.gross_profit ?? 0) / Number(live?.revenue ?? 1)) * 100).toFixed(1)}%`
                : "0%"
            }
          />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Closing a month snapshots these totals into the archive, marks completed and cancelled
          orders of {monthLabel(selected)} as archived, and opens the next cycle. Nothing is deleted
          — archived orders stay searchable on the Orders page.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Monthly report archive</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(`monthly-archive-${stamp()}.csv`, archiveColumns, reports)}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportExcel(`monthly-archive-${stamp()}.xls`, "Archive", archiveColumns, reports)
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                printDocument({
                  title: "Monthly Report Archive",
                  subtitle: `${reports.length} closed month${reports.length === 1 ? "" : "s"}`,
                  kpis: [
                    { label: "Total revenue", value: formatINR(archiveTotals.revenue) },
                    { label: "Total orders", value: String(archiveTotals.orders) },
                    { label: "Total COGS", value: formatINR(archiveTotals.cogs) },
                    { label: "Gross profit", value: formatINR(archiveTotals.profit) },
                  ],
                  sections: [{ title: "Months", columns: archiveColumns, rows: reports }],
                })
              }
            >
              <Printer className="mr-2 h-4 w-4" />
              PDF / Print
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">COGS</th>
                <th className="px-4 py-3 text-right">Gross profit</th>
                <th className="px-4 py-3 text-right">Margin</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    No months closed yet
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{monthLabel(r.month)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(Number(r.revenue))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.orders_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.items_sold}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(Number(r.cogs))}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-veg">
                    {formatINR(Number(r.gross_profit))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.revenue) > 0
                      ? `${((Number(r.gross_profit) / Number(r.revenue)) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete archived report"
                      onClick={() => {
                        removeReport.mutate(r.id, {
                          onSuccess: () => toast.success("Archived report removed"),
                          onError: (e) => toast.error((e as Error).message),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {reports.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-surface-2 font-bold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(archiveTotals.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{archiveTotals.orders}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(archiveTotals.cogs)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-veg">
                    {formatINR(archiveTotals.profit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {archiveTotals.revenue > 0
                      ? `${((archiveTotals.profit / archiveTotals.revenue) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="mt-6">
        <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Business cycles
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {cycles.map((c) => (
            <span
              key={c.id}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold " +
                (c.status === "closed"
                  ? "border-border bg-surface-2 text-muted-foreground"
                  : "border-veg/40 bg-veg/10 text-veg")
              }
            >
              {monthLabel(c.month)} · {c.status}
            </span>
          ))}
          {cycles.length === 0 && (
            <span className="text-sm text-muted-foreground">No cycles recorded yet</span>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
