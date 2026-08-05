import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, Plus, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import {
  useDeleteRecipeLine,
  useIngredients,
  useMenuItemRows,
  useRecipes,
  useSaveRecipeLine,
  type RecipeSection,
} from "@/lib/api";

export const Route = createFileRoute("/admin/recipes")({
  head: () => ({
    meta: [
      { title: "Recipes — Crave Cartel Admin" },
      {
        name: "description",
        content: "Define ingredients per menu item so inventory deducts automatically.",
      },
      { property: "og:title", content: "Recipes — Crave Cartel Admin" },
      { property: "og:description", content: "Recipe editor and BOM." },
    ],
  }),
  component: RecipesPage,
});

const SECTIONS: { value: RecipeSection; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "sauces", label: "Sauces" },
  { value: "dip", label: "Dip" },
];

function RecipesPage() {
  const { data: menu = [] } = useMenuItemRows();
  const { data: ingredients = [] } = useIngredients();
  const { data: recipes = [] } = useRecipes();
  const save = useSaveRecipeLine();
  const del = useDeleteRecipeLine();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newIng, setNewIng] = useState<string>("");
  const [newQty, setNewQty] = useState<number>(0);
  const [newSection, setNewSection] = useState<RecipeSection>("main");

  const selected = menu.find((m) => m.id === selectedId) ?? menu[0];
  const selectedIdFinal = selected?.id;

  const currentLines = useMemo(
    () => recipes.filter((r) => r.menu_item_id === selectedIdFinal),
    [recipes, selectedIdFinal],
  );

  const withRecipe = new Set(recipes.map((r) => r.menu_item_id));

  const cost = useMemo(() => {
    return currentLines.reduce((sum, l) => {
      const ing = ingredients.find((i) => i.id === l.ingredient_id);
      return sum + Number(l.qty_per_unit) * Number(ing?.cost_per_unit ?? 0);
    }, 0);
  }, [currentLines, ingredients]);

  async function addLine() {
    if (!selectedIdFinal || !newIng || newQty <= 0) return toast.error("Pick ingredient & qty");
    try {
      await save.mutateAsync({
        menu_item_id: selectedIdFinal,
        ingredient_id: newIng,
        qty_per_unit: newQty,
        section: newSection,
      });
      setNewIng("");
      setNewQty(0);
      toast.success("Added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AdminShell
      title="Recipes"
      description="Every menu item's ingredient list. Sales auto-deduct these amounts from inventory."
    >
      {ingredients.length === 0 && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          Add ingredients in <span className="font-bold">Inventory</span> first, then define recipes
          here.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Menu items
          </p>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            {menu.map((m) => {
              const active = (selectedIdFinal ?? menu[0]?.id) === m.id;
              const has = withRecipe.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition " +
                    (active
                      ? "bg-primary/12 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")
                  }
                >
                  <span className="truncate">{m.name}</span>
                  {has ? (
                    <ChefHat className="h-3.5 w-3.5 shrink-0 text-veg" />
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      empty
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Sell price ₹{Number(selected.price).toFixed(0)} · Recipe cost ₹{cost.toFixed(2)}{" "}
                    · Margin ₹{(Number(selected.price) - cost).toFixed(2)}
                  </p>
                </div>
              </div>

              {SECTIONS.map((section) => {
                const lines = currentLines.filter((l) => l.section === section.value);
                /* Sauces and Dip are optional — only shown when used. */
                if (lines.length === 0 && section.value !== "main") return null;
                return (
                  <div key={section.value} className="mt-5">
                    <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {section.label}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            <th className="px-4 py-3">Ingredient</th>
                            <th className="px-4 py-3">Qty per unit</th>
                            <th className="px-4 py-3">Line cost</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-8 text-center text-muted-foreground"
                              >
                                No ingredients in this recipe yet
                              </td>
                            </tr>
                          )}
                          {lines.map((l) => {
                            const ing = ingredients.find((i) => i.id === l.ingredient_id);
                            const lineCost =
                              Number(l.qty_per_unit) * Number(ing?.cost_per_unit ?? 0);
                            return (
                              <tr
                                key={`${l.section}-${l.ingredient_id}`}
                                className="border-b border-border/60 last:border-b-0"
                              >
                                <td className="px-4 py-3 font-semibold">{ing?.name ?? "?"}</td>
                                <td className="px-4 py-3 font-mono tabular-nums">
                                  {Number(l.qty_per_unit)} {ing?.unit}
                                </td>
                                <td className="px-4 py-3 tabular-nums">₹{lineCost.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      del.mutate({
                                        menu_item_id: l.menu_item_id,
                                        ingredient_id: l.ingredient_id,
                                        section: l.section,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                <div>
                  <Label>Add ingredient</Label>
                  <Select value={newIng} onValueChange={setNewIng}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients
                        .filter(
                          (i) =>
                            !currentLines.some(
                              (l) => l.ingredient_id === i.id && l.section === newSection,
                            ),
                        )
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select
                    value={newSection}
                    onValueChange={(v) => setNewSection(v as RecipeSection)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qty per unit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addLine} disabled={save.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Select a menu item to edit its recipe
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
