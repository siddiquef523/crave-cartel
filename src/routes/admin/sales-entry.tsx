import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Save, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatINR } from "@/lib/menu-data";
import { SALES_SOURCES, useCreateExternalSale, useMenuItemRows, type SalesSource } from "@/lib/api";

export const Route = createFileRoute("/admin/sales-entry")({
  head: () => ({
    meta: [
      { title: "Daily Sales Entry — Crave Cartel Admin" },
      { name: "description", content: "Record Swiggy, Zomato and walk-in sales." },
      { property: "og:title", content: "Daily Sales Entry — Crave Cartel Admin" },
      { property: "og:description", content: "Log external orders quickly." },
    ],
  }),
  component: SalesEntryPage,
});

type LineItem = { menu_item_id: string; name: string; price: number; qty: number };

const SOURCE_LABEL: Record<SalesSource, string> = {
  website: "Website",
  swiggy: "Swiggy",
  zomato: "Zomato",
  walkin: "Walk-in",
};

function SalesEntryPage() {
  const { data: menu } = useMenuItemRows();
  const create = useCreateExternalSale();

  const [source, setSource] = useState<Exclude<SalesSource, "website">>("swiggy");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (menu ?? []).filter((m) => m.available !== false);
    return q ? list.filter((m) => m.name.toLowerCase().includes(q)) : list.slice(0, 20);
  }, [menu, query]);

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  function addItem(m: { id: string; name: string; price: number }) {
    setLines((prev) => {
      const found = prev.find((l) => l.menu_item_id === m.id);
      if (found) return prev.map((l) => (l.menu_item_id === m.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { menu_item_id: m.id, name: m.name, price: Number(m.price), qty: 1 }];
    });
  }
  function updateQty(id: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.menu_item_id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    );
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.menu_item_id !== id));
  }

  async function submit() {
    if (lines.length === 0) return toast.error("Add at least one item");
    try {
      const orderNo = await create.mutateAsync({
        source,
        items: lines,
        total,
        sale_date: saleDate,
        customer_name: customerName.trim() || undefined,
        note: note || undefined,
      });
      toast.success(`Recorded ${SOURCE_LABEL[source]} sale ${orderNo}`);
      setLines([]);
      setNote("");
      setCustomerName("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AdminShell
      title="Daily Sales Entry"
      description="Log Swiggy, Zomato and walk-in orders — inventory auto-updates from recipes."
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Source
            </Label>
            {(["swiggy", "zomato", "walkin"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition " +
                  (source === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground")
                }
              >
                {SOURCE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sale-date">Sale date</Label>
              <Input
                id="sale-date"
                type="date"
                value={saleDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sale-customer">Customer / reference (optional)</Label>
              <Input
                id="sale-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={source === "walkin" ? "Walk-in" : `${SOURCE_LABEL[source]} order`}
              />
            </div>
          </div>

          <Input
            placeholder="Search menu items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-4"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addItem(m)}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition hover:border-primary/60 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{formatINR(Number(m.price))}</p>
                </div>
                <Plus className="h-4 w-4 text-primary" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No items match "{query}"
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="mt-4 space-y-2">
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Tap items on the left to add them
              </p>
            ) : (
              lines.map((l) => (
                <div
                  key={l.menu_item_id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatINR(l.price)} × {l.qty} = {formatINR(l.price * l.qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md border border-border"
                      onClick={() => updateQty(l.menu_item_id, -1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md border border-border"
                      onClick={() => updateQty(l.menu_item_id, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeLine(l.menu_item_id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Batch ID, delivery partner, etc."
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-extrabold">{formatINR(total)}</span>
            </div>
            <Button
              className="w-full"
              onClick={submit}
              disabled={create.isPending || lines.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              {create.isPending ? "Saving…" : `Record ${SOURCE_LABEL[source]} sale`}
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
