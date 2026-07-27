import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { formatINR } from "@/lib/menu-data";
import { VegBadge } from "@/components/site/FoodCard";
import {
  useCategories,
  useMenuItemRows,
  useSaveMenuItem,
  useDeleteMenuItem,
  uploadImage,
  type MenuItemRow,
} from "@/lib/api";

export const Route = createFileRoute("/admin/menu")({
  head: () => ({
    meta: [
      { title: "Menu Management — Crave Cartel Admin" },
      {
        name: "description",
        content:
          "Add, edit and retire dishes, set availability and flag best sellers for the Crave Cartel menu.",
      },
      { property: "og:title", content: "Menu Management — Crave Cartel Admin" },
      { property: "og:description", content: "Full control of the kitchen's dish catalogue." },
    ],
  }),
  component: MenuAdmin,
});

type FormState = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  veg: boolean;
  available: boolean;
  best_seller: boolean;
  featured: boolean;
  image_url: string | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  veg: false,
  available: true,
  best_seller: false,
  featured: false,
  image_url: null,
};

function MenuAdmin() {
  const { data: items, isLoading } = useMenuItemRows();
  const { data: categories } = useCategories();
  const saveMenuItem = useSaveMenuItem();
  const deleteMenuItem = useDeleteMenuItem();

  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryName = (id: string | null) =>
    (categories ?? []).find((c) => c.id === id)?.name ?? "Uncategorised";

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category_id: categories?.[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(item: MenuItemRow) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category_id: item.category_id ?? "",
      veg: item.veg,
      available: item.available,
      best_seller: item.best_seller,
      featured: item.featured,
      image_url: item.image_url,
    });
    setOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(item: MenuItemRow, key: "available" | "best_seller" | "featured") {
    saveMenuItem.mutate(
      { id: item.id, [key]: !item[key] },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update item") },
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, form.image_url);
      update("image_url", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category_id || !form.price) {
      toast.error("Name, category and price are required.");
      return;
    }
    saveMenuItem.mutate(
      {
        id: editing?.id,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category_id: form.category_id,
        veg: form.veg,
        available: form.available,
        best_seller: form.best_seller,
        featured: form.featured,
        image_url: form.image_url,
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Item updated" : "Item added");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save item"),
      },
    );
  }

  async function handleDelete(item: MenuItemRow) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteMenuItem.mutateAsync(item.id);
      toast.success("Item deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Menu Management"
      description={`${items?.length ?? 0} dishes on the catalogue`}
      actions={
        <Button variant="ember" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(items ?? []).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 p-3">
                <img
                  src={item.image_url ?? "/menu/hero-burger.jpg"}
                  alt={item.name}
                  loading="lazy"
                  width={176}
                  height={176}
                  className="h-22 w-22 aspect-square rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <VegBadge veg={item.veg} />
                    <p className="min-w-0 flex-1 truncate font-display text-base font-bold">
                      {item.name}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-extrabold">{formatINR(Number(item.price))}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {categoryName(item.category_id)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-border px-4 py-3">
                <ToggleRow
                  label="Available"
                  checked={item.available}
                  onChange={() => toggle(item, "available")}
                />
                <ToggleRow
                  label="Best seller"
                  checked={item.best_seller}
                  onChange={() => toggle(item, "best_seller")}
                />
                <ToggleRow
                  label="Featured"
                  checked={item.featured}
                  onChange={() => toggle(item, "featured")}
                />
              </div>

              <div className="flex gap-2 border-t border-border px-4 py-3">
                <Button variant="ghostline" size="sm" className="flex-1" onClick={() => openEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item)}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </Button>
              </div>
            </motion.div>
          ))}
          {(items ?? []).length === 0 && (
            <p className="col-span-full py-16 text-center text-muted-foreground">
              No menu items yet — add your first dish.
            </p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              {editing ? "Edit item" : "Add new item"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Changes appear on the customer menu immediately after saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Item image</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center transition-colors hover:border-primary/50">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {form.image_url && !uploading ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-20 w-20 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
                <p className="text-sm font-semibold">
                  {uploading ? "Uploading…" : "Drop an image or click to upload"}
                </p>
                <p className="text-xs text-muted-foreground">JPG or PNG · square · up to 4 MB</p>
              </label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Cartel Double Smash"
                className="h-11 rounded-xl border-border bg-surface"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="What makes this dish worth the pickup?"
                className="rounded-xl border-border bg-surface"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => update("category_id", v)}>
                  <SelectTrigger className="h-11 rounded-xl border-border bg-surface">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Price (₹)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  className="h-11 rounded-xl border-border bg-surface"
                />
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
              <ToggleRow label="Vegetarian" checked={form.veg} onChange={() => update("veg", !form.veg)} />
              <ToggleRow
                label="Available"
                checked={form.available}
                onChange={() => update("available", !form.available)}
              />
              <ToggleRow
                label="Best seller"
                checked={form.best_seller}
                onChange={() => update("best_seller", !form.best_seller)}
              />
              <ToggleRow
                label="Featured"
                checked={form.featured}
                onChange={() => update("featured", !form.featured)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghostline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="ember" onClick={handleSave} disabled={saveMenuItem.isPending}>
              {saveMenuItem.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
