import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Download, Package, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useDeleteIngredient,
  useIngredients,
  useMovements,
  useRecordStockChange,
  useSaveIngredient,
  type IngredientRow,
  type InventoryReason,
} from "@/lib/api";
import { useIngredientCategories, useUnits } from "@/lib/management";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Crave Cartel Admin" },
      { name: "description", content: "Ingredient stock, restocks, waste and low-stock alerts." },
      { property: "og:title", content: "Inventory — Crave Cartel Admin" },
      { property: "og:description", content: "Real-time stock levels." },
    ],
  }),
  component: InventoryPage,
});

const FALLBACK_UNITS = ["g", "kg", "ml", "l", "pcs"];
const UNCATEGORISED = "__none__";

function InventoryPage() {
  const { data: ingredients = [] } = useIngredients();
  const { data: movements = [] } = useMovements(50);
  const { data: categories = [] } = useIngredientCategories();
  const { data: unitRows = [] } = useUnits();
  const save = useSaveIngredient();
  const del = useDeleteIngredient();
  const change = useRecordStockChange();

  const [editing, setEditing] = useState<Partial<IngredientRow> | null>(null);
  const [stockAction, setStockAction] = useState<{
    ing: IngredientRow;
    reason: InventoryReason;
  } | null>(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowOnly, setLowOnly] = useState(false);

  const unitOptions = unitRows.length > 0 ? unitRows.map((u) => u.name) : FALLBACK_UNITS;
  const categoryName = (id: string | null | undefined) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ingredients.filter((i) => {
      if (s && !i.name.toLowerCase().includes(s)) return false;
      if (categoryFilter !== "all" && (i.category_id ?? UNCATEGORISED) !== categoryFilter)
        return false;
      if (lowOnly && Number(i.stock_qty) > Number(i.low_threshold)) return false;
      return true;
    });
  }, [ingredients, q, categoryFilter, lowOnly]);

  const lowStock = ingredients.filter((i) => Number(i.stock_qty) <= Number(i.low_threshold));
  const totalValue = ingredients.reduce(
    (s, i) => s + Number(i.stock_qty) * Number(i.cost_per_unit),
    0,
  );

  function exportCSV() {
    const rows = [
      ["Name", "Category", "Unit", "Stock", "Low threshold", "Cost/unit", "Value", "Supplier"],
      ...ingredients.map((i) => [
        i.name,
        categoryName(i.category_id),
        i.unit,
        i.stock_qty,
        i.low_threshold,
        i.cost_per_unit,
        (Number(i.stock_qty) * Number(i.cost_per_unit)).toFixed(2),
        i.supplier ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell
      title="Inventory"
      description="Track ingredient stock, restocks and waste"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={() =>
              setEditing({ unit: "g", stock_qty: 0, low_threshold: 0, cost_per_unit: 0 })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Ingredient
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total ingredients" value={String(ingredients.length)} icon={Package} />
        <Kpi
          label="Low stock items"
          value={String(lowStock.length)}
          icon={AlertTriangle}
          accent={lowStock.length > 0}
        />
        <Kpi label="Inventory value" value={`₹${totalValue.toFixed(0)}`} icon={Package} />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-bold text-primary">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Low stock alert
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lowStock.map((i) => `${i.name} (${i.stock_qty}${i.unit})`).join(" · ")}
          </p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="space-y-3 border-b border-border p-4">
          <Input
            placeholder="Search ingredients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {[
              { id: "all", name: "All categories" },
              ...categories.map((c) => ({ id: c.id, name: c.name })),
              { id: UNCATEGORISED, name: "Uncategorised" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  categoryFilter === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLowOnly((v) => !v)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                lowOnly
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              Low stock only
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Cost/unit</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No ingredients yet — add your first one.
                  </td>
                </tr>
              )}
              {filtered.map((i) => {
                const low = Number(i.stock_qty) <= Number(i.low_threshold);
                return (
                  <tr key={i.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-semibold">
                      <span className="flex items-center gap-2">
                        {i.name}
                        {low && (
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            Low
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {categoryName(i.category_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn("font-mono tabular-nums", low && "text-primary font-bold")}
                      >
                        {Number(i.stock_qty).toFixed(2)} {i.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {Number(i.low_threshold).toFixed(2)} {i.unit}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      ₹{Number(i.cost_per_unit).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{i.supplier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockAction({ ing: i, reason: "restock" })}
                        >
                          Restock
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStockAction({ ing: i, reason: "waste" })}
                        >
                          Waste
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                          Edit
                        </Button>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete ${i.name}?`)) del.mutate(i.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Recent stock movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No movements yet
                  </td>
                </tr>
              )}
              {movements.map((m) => {
                const name = ingredients.find((i) => i.id === m.ingredient_id)?.name ?? "—";
                const positive = Number(m.delta) >= 0;
                return (
                  <tr key={m.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{name}</td>
                    <td
                      className={cn(
                        "px-4 py-3 font-mono tabular-nums",
                        positive ? "text-veg" : "text-primary",
                      )}
                    >
                      {positive ? "+" : ""}
                      {Number(m.delta).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 capitalize">{m.reason}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit ingredient" : "New ingredient"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category_id ?? UNCATEGORISED}
                    onValueChange={(v) =>
                      setEditing({ ...editing, category_id: v === UNCATEGORISED ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Uncategorised" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNCATEGORISED}>Uncategorised</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={editing.unit ?? "g"}
                    onValueChange={(v) => setEditing({ ...editing, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u: string) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cost per unit (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.cost_per_unit ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, cost_per_unit: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Current stock</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.stock_qty ?? 0}
                    onChange={(e) => setEditing({ ...editing, stock_qty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Low threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.low_threshold ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, low_threshold: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Supplier</Label>
                <Input
                  value={editing.supplier ?? ""}
                  onChange={(e) => setEditing({ ...editing, supplier: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editing?.name) return toast.error("Name required");
                try {
                  await save.mutateAsync(editing);
                  toast.success("Ingredient saved");
                  setEditing(null);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              disabled={save.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock change dialog */}
      <StockChangeDialog
        state={stockAction}
        onClose={() => setStockAction(null)}
        onSubmit={async (qty, note) => {
          if (!stockAction) return;
          const delta = stockAction.reason === "restock" ? qty : -qty;
          try {
            await change.mutateAsync({
              ingredient_id: stockAction.ing.id,
              delta,
              reason: stockAction.reason,
              note,
            });
            toast.success("Stock updated");
            setStockAction(null);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </AdminShell>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        accent ? "border-primary/40 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function StockChangeDialog({
  state,
  onClose,
  onSubmit,
}: {
  state: { ing: IngredientRow; reason: InventoryReason } | null;
  onClose: () => void;
  onSubmit: (qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const title = state?.reason === "restock" ? "Restock" : "Record waste";
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && (onClose(), setQty(0), setNote(""))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title} — {state?.ing.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quantity ({state?.ing.unit})</Label>
            <Input
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (qty <= 0) return;
              onSubmit(qty, note);
              setQty(0);
              setNote("");
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
