import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCategories,
  useMenuItemRows,
  useSaveCategory,
  useDeleteCategory,
  type CategoryRow,
} from "@/lib/api";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Crave Cartel Admin" },
      {
        name: "description",
        content: "Organise how dishes are grouped and ordered across the Crave Cartel menu.",
      },
      { property: "og:title", content: "Categories — Crave Cartel Admin" },
      { property: "og:description", content: "Manage menu categories and their ordering." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const { data: items } = useMenuItemRows();
  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(cat: CategoryRow) {
    setEditing(cat);
    setName(cat.name);
    setOpen(true);
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    saveCategory.mutate(
      { id: editing?.id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(editing ? "Category updated" : "Category added");
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save category"),
      },
    );
  }

  async function handleDelete(cat: CategoryRow) {
    const count = (items ?? []).filter((i) => i.category_id === cat.id).length;
    if (count > 0) {
      toast.error(`Move or delete the ${count} item(s) in "${cat.name}" first.`);
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      await deleteCategory.mutateAsync(cat.id);
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Categories"
      description="Control the order dishes appear in"
      actions={
        <Button variant="ember" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(categories ?? []).map((c) => {
            const count = (items ?? []).filter((m) => m.category_id === c.id).length;
            return (
              <li
                key={c.id}
                className="card-lift grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} item{count === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="ghostline" size="sm" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c)}
                >
                  {deletingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            );
          })}
          {(categories ?? []).length === 0 && (
            <p className="col-span-full py-16 text-center text-muted-foreground">
              No categories yet — add your first one.
            </p>
          )}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              {editing ? "Edit category" : "New category"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Categories group dishes on the customer menu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Starters"
              className="h-11 rounded-xl border-border bg-surface"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghostline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="ember" onClick={handleSave} disabled={saveCategory.isPending}>
              {saveCategory.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
