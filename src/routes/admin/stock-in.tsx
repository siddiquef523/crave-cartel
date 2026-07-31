import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save, Trash2, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/menu-data";
import { useIngredients } from "@/lib/api";
import { useStockIn, type StockInLine } from "@/lib/management";

export const Route = createFileRoute("/admin/stock-in")({
  head: () => ({
    meta: [
      { title: "Stock In — Crave Cartel Admin" },
      { name: "description", content: "Record purchases and restock ingredients in bulk." },
      { property: "og:title", content: "Stock In — Crave Cartel Admin" },
      { property: "og:description", content: "Log supplier deliveries and update stock levels." },
    ],
  }),
  component: StockInPage,
});

type Draft = StockInLine & { key: string };

function newDraft(): Draft {
  return {
    key: crypto.randomUUID(),
    ingredient_id: "",
    qty: 0,
    unit_cost: null,
    supplier: "",
    note: "",
  };
}

function StockInPage() {
  const { data: ingredients = [] } = useIngredients();
  const stockIn = useStockIn();

  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Draft[]>([newDraft()]);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const valid = lines.filter((l) => l.ingredient_id && Number(l.qty) > 0);
  const totalCost = valid.reduce((s, l) => s + Number(l.qty) * Number(l.unit_cost ?? 0), 0);

  function patch(key: string, values: Partial<Draft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...values } : l)));
  }

  async function submit() {
    if (valid.length === 0) return toast.error("Add at least one ingredient with a quantity");
    try {
      await stockIn.mutateAsync(
        valid.map((l) => ({
          // eslint-disable-next-line prettier/prettier
          ingredient_id: l.ingredient_id,
          qty: Number(l.qty),
          unit_cost: l.unit_cost === null || l.unit_cost === undefined ? null : Number(l.unit_cost),
          supplier: (l.supplier || supplier || "").trim() || null,
          note: (l.note || note || "").trim() || null,
        })),
      );
      toast.success(`Stocked in ${valid.length} ingredient${valid.length > 1 ? "s" : ""}`);
      setLines([newDraft()]);
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AdminShell
      title="Stock In"
      description="Record supplier deliveries — stock levels and cost prices update instantly"
      actions={
        <Button onClick={submit} disabled={stockIn.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {stockIn.isPending ? "Saving…" : "Save stock in"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TruckIcon className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Delivery lines</h2>
          </div>

          <div className="space-y-3">
            {lines.map((l) => {
              const ing = byId.get(l.ingredient_id);
              return (
                <div
                  key={l.key}
                  className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1.4fr)_100px_120px_minmax(0,1fr)_40px]"
                >
                  <Select
                    value={l.ingredient_id}
                    onValueChange={(v) => patch(l.key, { ingredient_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    placeholder="Qty"
                    value={l.qty || ""}
                    onChange={(e) => patch(l.key, { qty: Number(e.target.value) })}
                  />

                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={ing ? `Cost/${ing.unit}` : "Unit cost"}
                    value={l.unit_cost ?? ""}
                    onChange={(e) =>
                      patch(l.key, {
                        unit_cost: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />

                  <Input
                    placeholder="Line note (optional)"
                    value={l.note ?? ""}
                    onChange={(e) => patch(l.key, { note: e.target.value })}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="mt-3"
            onClick={() => setLines((prev) => [...prev, newDraft()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add line
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Delivery details</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  className="mt-1.5"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Metro Cash & Carry"
                />
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  className="mt-1.5"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Invoice number, remarks…"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Purchase value
            </span>
            <p className="mt-2 font-display text-3xl font-extrabold">{formatINR(totalCost)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {valid.length} line{valid.length === 1 ? "" : "s"} ready
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
