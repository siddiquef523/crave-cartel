import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useMenu } from "@/lib/api";
import { formatINR } from "@/lib/menu-data";
import {
  DISCOUNT_SCOPES,
  DISCOUNT_SCOPE_LABELS,
  discountBadge,
  isDiscountLive,
  useDeleteDiscount,
  useDiscounts,
  useSaveDiscount,
  useToggleDiscount,
  type DiscountKind,
  type DiscountRow,
  type DiscountScope,
} from "@/lib/discounts";

export const Route = createFileRoute("/admin/discounts")({
  head: () => ({
    meta: [
      { title: "Discounts — Crave Cartel Admin" },
      {
        name: "description",
        content:
          "Create percentage or flat discounts on the whole menu, a category or hand-picked dishes, with scheduling and priority.",
      },
      { property: "og:title", content: "Discounts — Crave Cartel Admin" },
      {
        property: "og:description",
        content: "Schedule menu-wide, category and item level offers.",
      },
    ],
  }),
  component: DiscountsAdmin,
});

type FormState = {
  name: string;
  kind: DiscountKind;
  value: string;
  scope: DiscountScope;
  enabled: boolean;
  start_date: string;
  end_date: string;
  priority: string;
  category_ids: string[];
  menu_item_ids: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  kind: "percentage",
  value: "10",
  scope: "all",
  enabled: true,
  start_date: "",
  end_date: "",
  priority: "0",
  category_ids: [],
  menu_item_ids: [],
};

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function DiscountsAdmin() {
  const { data: discounts, isLoading } = useDiscounts();
  const { menu } = useMenu();
  const { data: categories } = useCategories();
  const saveDiscount = useSaveDiscount();
  const toggleDiscount = useToggleDiscount();
  const deleteDiscount = useDeleteDiscount();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const categoryList = categories ?? [];
  const previewItems = useMemo(() => menu.slice(0, 60), [menu]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleIn(key: "category_ids" | "menu_item_ids", id: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(d: DiscountRow) {
    setEditing(d);
    setForm({
      name: d.name,
      kind: d.kind,
      value: String(d.value),
      scope: d.scope,
      enabled: d.enabled,
      start_date: toLocalInput(d.start_date),
      end_date: toLocalInput(d.end_date),
      priority: String(d.priority),
      category_ids: d.category_ids,
      menu_item_ids: d.menu_item_ids,
    });
    setOpen(true);
  }

  function handleSave() {
    const value = Number(form.value);
    if (!form.name.trim()) return toast.error("Give the discount a name.");
    if (!Number.isFinite(value) || value <= 0)
      return toast.error("Enter a discount value above 0.");
    if (form.kind === "percentage" && value > 90)
      return toast.error("Percentage discounts are capped at 90%.");
    if (form.scope === "category" && form.category_ids.length === 0)
      return toast.error("Select at least one category.");
    if (form.scope === "items" && form.menu_item_ids.length === 0)
      return toast.error("Select at least one dish.");

    saveDiscount.mutate(
      {
        id: editing?.id,
        name: form.name.trim(),
        kind: form.kind,
        value,
        scope: form.scope,
        enabled: form.enabled,
        start_date: fromLocalInput(form.start_date),
        end_date: fromLocalInput(form.end_date),
        priority: Number(form.priority) || 0,
        category_ids: form.scope === "category" ? form.category_ids : [],
        menu_item_ids: form.scope === "items" ? form.menu_item_ids : [],
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Discount updated" : "Discount created");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save discount"),
      },
    );
  }

  return (
    <AdminShell
      title="Discounts"
      description="Run offers on the entire menu, selected categories or individual dishes. Prices update everywhere instantly."
      actions={
        <Button variant="ember" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Discount
        </Button>
      }
    >
      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          When several discounts match a dish, the one with the highest priority wins; on a tie the
          bigger saving is applied. Discounted prices flow straight into the cart, checkout and
          sales reports.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-5 grid place-items-center rounded-3xl border border-border bg-card py-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (discounts ?? []).length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <Tag className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-bold">No discounts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first offer to show strikethrough pricing on the website.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {(discounts ?? []).map((d, i) => {
            const live = isDiscountLive(d);
            const targets =
              d.scope === "all"
                ? "Entire menu"
                : d.scope === "category"
                  ? `${d.category_ids.length} category(ies)`
                  : `${d.menu_item_ids.length} dish(es)`;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
                className="rounded-3xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {discountBadge(d)}
                  </span>
                  <span
                    className={
                      live
                        ? "rounded-full bg-veg/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-veg"
                        : "rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    }
                  >
                    {live ? "Live" : "Inactive"}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Priority {d.priority}
                  </span>
                </div>

                <p className="mt-2 font-display text-lg font-bold">{d.name}</p>
                <p className="text-sm text-muted-foreground">
                  {DISCOUNT_SCOPE_LABELS[d.scope]} · {targets}
                </p>
                {(d.start_date || d.end_date) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.start_date ? new Date(d.start_date).toLocaleString() : "Anytime"} →{" "}
                    {d.end_date ? new Date(d.end_date).toLocaleString() : "No end"}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <Switch
                      checked={d.enabled}
                      onCheckedChange={(v) =>
                        toggleDiscount.mutate(
                          { id: d.id, enabled: v },
                          {
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Update failed"),
                          },
                        )
                      }
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <Button variant="ghostline" size="sm" onClick={() => openEdit(d)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="ghostline"
                      size="sm"
                      onClick={() => {
                        if (!window.confirm(`Delete discount "${d.name}"?`)) return;
                        deleteDiscount.mutate(d.id, {
                          onSuccess: () => toast.success("Discount deleted"),
                          onError: (e) =>
                            toast.error(e instanceof Error ? e.message : "Delete failed"),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------ form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Discount" : "New Discount"}</DialogTitle>
            <DialogDescription>
              Percentage or flat value off, applied live on the website.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Weekend Biryani Offer"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => update("kind", v as DiscountKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.kind === "percentage" ? "Percent off" : "Rupees off"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.value}
                  onChange={(e) => update("value", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applies to</Label>
              <Select value={form.scope} onValueChange={(v) => update("scope", v as DiscountScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DISCOUNT_SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.scope === "category" && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3">
                  {categoryList.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={form.category_ids.includes(c.id)}
                        onCheckedChange={() => toggleIn("category_ids", c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.scope === "items" && (
              <div className="space-y-2">
                <Label>Dishes</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3">
                  {previewItems.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={form.menu_item_ids.includes(m.id)}
                        onCheckedChange={() => toggleIn("menu_item_ids", m.id)}
                      />
                      <span className="min-w-0 truncate">{m.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatINR(m.originalPrice ?? m.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => update("end_date", e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
              <span className="text-sm font-semibold">Enable this discount</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghostline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="ember" onClick={handleSave} disabled={saveDiscount.isPending}>
              {saveDiscount.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
