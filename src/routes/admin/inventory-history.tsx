import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/menu-data";
import { useIngredients, type InventoryReason } from "@/lib/api";
import { useMovementHistory, type MovementDetailRow } from "@/lib/management";
import { exportCSV, exportExcel, printDocument, stamp, type Column } from "@/lib/exporters";

export const Route = createFileRoute("/admin/inventory-history")({
  head: () => ({
    meta: [
      { title: "Inventory History — Crave Cartel Admin" },
      {
        name: "description",
        content: "Every stock movement: sales, restocks, waste, adjustments.",
      },
      { property: "og:title", content: "Inventory History — Crave Cartel Admin" },
      { property: "og:description", content: "Full audit trail of ingredient stock changes." },
    ],
  }),
  component: InventoryHistoryPage,
});

const REASONS: (InventoryReason | "all")[] = [
  "all",
  "sale",
  "restock",
  "waste",
  "adjustment",
  "reversal",
];

function InventoryHistoryPage() {
  const { data: ingredients = [] } = useIngredients();

  const [ingredientId, setIngredientId] = useState<string>("all");
  const [reason, setReason] = useState<InventoryReason | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading } = useMovementHistory({
    ingredientId: ingredientId === "all" ? undefined : ingredientId,
    reason,
    from: from || undefined,
    to: to || undefined,
  });

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const totals = useMemo(() => {
    const inQty = rows.filter((r) => r.delta > 0).reduce((s, r) => s + Number(r.delta), 0);
    const outQty = rows.filter((r) => r.delta < 0).reduce((s, r) => s + Number(r.delta), 0);
    const purchaseValue = rows
      .filter((r) => r.delta > 0 && r.unit_cost)
      .reduce((s, r) => s + Number(r.delta) * Number(r.unit_cost), 0);
    return { inQty, outQty, purchaseValue, count: rows.length };
  }, [rows]);

  const columns: Column<MovementDetailRow>[] = [
    { header: "Date", value: (r) => new Date(r.created_at).toLocaleString() },
    { header: "Ingredient", value: (r) => byId.get(r.ingredient_id)?.name ?? "—" },
    { header: "Unit", value: (r) => byId.get(r.ingredient_id)?.unit ?? "" },
    { header: "Reason", value: (r) => r.reason, align: "left" },
    { header: "Change", value: (r) => Number(r.delta), align: "right" },
    { header: "Unit cost", value: (r) => (r.unit_cost ? Number(r.unit_cost) : ""), align: "right" },
    { header: "Supplier", value: (r) => r.supplier ?? "" },
    { header: "Note", value: (r) => r.note ?? "" },
  ];

  return (
    <AdminShell
      title="Inventory History"
      description="Complete audit trail of every stock movement"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportCSV(`inventory-history-${stamp()}.csv`, columns, rows)}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportExcel(`inventory-history-${stamp()}.xls`, "History", columns, rows)
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              printDocument({
                title: "Inventory History",
                subtitle: `${from || "Beginning"} → ${to || "Today"} · ${rows.length} movements`,
                kpis: [
                  { label: "Movements", value: String(totals.count) },
                  { label: "Stock in", value: totals.inQty.toFixed(2) },
                  { label: "Stock out", value: totals.outQty.toFixed(2) },
                  { label: "Purchase value", value: formatINR(totals.purchaseValue) },
                ],
                sections: [{ title: "Movements", columns, rows }],
              })
            }
          >
            <Printer className="mr-2 h-4 w-4" />
            PDF / Print
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label>Ingredient</Label>
          <Select value={ingredientId} onValueChange={setIngredientId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ingredients</SelectItem>
              {ingredients.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as InventoryReason | "all")}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r === "all" ? "All reasons" : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            className="mt-1.5"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            className="mt-1.5"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Movements" value={String(totals.count)} />
        <Kpi label="Stock in" value={totals.inQty.toFixed(2)} />
        <Kpi label="Stock out" value={totals.outQty.toFixed(2)} />
        <Kpi label="Purchase value" value={formatINR(totals.purchaseValue)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-right">Unit cost</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    No movements for this filter
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const ing = byId.get(r.ingredient_id);
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{ing?.name ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{r.reason}</td>
                    <td
                      className={
                        "px-4 py-3 text-right font-bold tabular-nums " +
                        (Number(r.delta) >= 0 ? "text-veg" : "text-primary")
                      }
                    >
                      {Number(r.delta) > 0 ? "+" : ""}
                      {Number(r.delta)} {ing?.unit ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.unit_cost ? formatINR(Number(r.unit_cost)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.supplier ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
