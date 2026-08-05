import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, Plus, Save, Trash2 } from "lucide-react";
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
import { useIngredients, useSaveIngredient } from "@/lib/api";
import { useIngredientCategories, useUnits } from "@/lib/management";
import {
  SAUCE_BATTER_CATEGORY,
  convertQty,
  productionScale,
  useDeleteProductionRecipe,
  useProductionBatchItems,
  useProductionBatches,
  useProductionRecipeItems,
  useProductionRecipes,
  useRecordProduction,
  useSaveProductionRecipe,
  type ProductionRecipeLineInput,
} from "@/lib/production";

export const Route = createFileRoute("/admin/production")({
  head: () => ({
    meta: [
      { title: "Production — Crave Cartel Admin" },
      {
        name: "description",
        content: "Produce sauces and batters from raw inventory with automatic ingredient scaling.",
      },
      { property: "og:title", content: "Production — Crave Cartel Admin" },
      { property: "og:description", content: "Sauce & batter production recipes and batch log." },
    ],
  }),
  component: ProductionPage,
});

type Draft = ProductionRecipeLineInput & { key: string };

function newDraft(unit = "g"): Draft {
  return { key: crypto.randomUUID(), ingredient_id: "", qty: 0, unit };
}

function ProductionPage() {
  const { data: ingredients = [] } = useIngredients();
  const { data: categories = [] } = useIngredientCategories();
  const { data: units = [] } = useUnits();
  const { data: recipes = [] } = useProductionRecipes();
  const { data: recipeItems = [] } = useProductionRecipeItems();
  const { data: batches = [] } = useProductionBatches();

  const saveIngredient = useSaveIngredient();
  const saveRecipe = useSaveProductionRecipe();
  const deleteRecipe = useDeleteProductionRecipe();
  const produce = useRecordProduction();

  const category = categories.find((c) => c.name === SAUCE_BATTER_CATEGORY);
  const products = useMemo(
    () => ingredients.filter((i) => category && i.category_id === category.id),
    [ingredients, category],
  );
  const rawIngredients = useMemo(
    () => ingredients.filter((i) => !category || i.category_id !== category.id),
    [ingredients, category],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((p) => p.id === selectedId) ?? products[0];
  const selectedIdFinal = selected?.id;

  const recipe = recipes.find((r) => r.product_id === selectedIdFinal);

  /* recipe editor state */
  const [outputQty, setOutputQty] = useState(1);
  const [outputUnit, setOutputUnit] = useState("pcs");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Draft[]>([newDraft()]);

  /* production run state */
  const [producedQty, setProducedQty] = useState(0);
  const [producedUnit, setProducedUnit] = useState("pcs");
  const [runNote, setRunNote] = useState("");

  /* new product state */
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("bottle");

  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const { data: batchItems = [] } = useProductionBatchItems(openBatchId);

  useEffect(() => {
    if (!selectedIdFinal) return;
    if (recipe) {
      setOutputQty(Number(recipe.output_qty));
      setOutputUnit(recipe.output_unit);
      setNotes(recipe.notes ?? "");
      const existing = recipeItems
        .filter((i) => i.production_recipe_id === recipe.id)
        .map((i) => ({
          key: i.id,
          ingredient_id: i.ingredient_id,
          qty: Number(i.qty),
          unit: i.unit,
        }));
      setLines(existing.length > 0 ? existing : [newDraft()]);
      setProducedUnit(recipe.output_unit);
    } else {
      setOutputQty(1);
      setOutputUnit(selected?.unit ?? "pcs");
      setNotes("");
      setLines([newDraft()]);
      setProducedUnit(selected?.unit ?? "pcs");
    }
    setProducedQty(0);
    setRunNote("");
  }, [selectedIdFinal, recipe, recipeItems, selected?.unit]);

  const unitNames = units.length > 0 ? units.map((u) => u.name) : ["pcs"];
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const scale =
    producedQty > 0 ? productionScale(producedQty, producedUnit, outputQty, outputUnit) : 0;

  const recipeCost = lines.reduce((sum, l) => {
    const ing = byId.get(l.ingredient_id);
    if (!ing) return sum;
    return sum + convertQty(Number(l.qty), l.unit, ing.unit) * Number(ing.cost_per_unit);
  }, 0);

  function patch(key: string, values: Partial<Draft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...values } : l)));
  }

  async function addProduct() {
    if (!category) return toast.error("Sauce & Batter category is missing");
    if (!newName.trim()) return toast.error("Enter a product name");
    try {
      await saveIngredient.mutateAsync({
        name: newName.trim(),
        unit: newUnit,
        category_id: category.id,
      });
      setNewName("");
      toast.success("Product added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submitRecipe() {
    if (!selectedIdFinal) return;
    if (outputQty <= 0) return toast.error("Output quantity must be greater than zero");
    const clean = lines.filter((l) => l.ingredient_id && Number(l.qty) > 0);
    if (clean.length === 0) return toast.error("Add at least one ingredient");
    try {
      await saveRecipe.mutateAsync({
        id: recipe?.id,
        product_id: selectedIdFinal,
        output_qty: outputQty,
        output_unit: outputUnit,
        notes: notes.trim() || null,
        lines: clean.map(({ ingredient_id, qty, unit }) => ({
          ingredient_id,
          qty: Number(qty),
          unit,
        })),
      });
      toast.success("Recipe saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function runProduction() {
    if (!selectedIdFinal) return;
    if (!recipe) return toast.error("Save the recipe first");
    if (producedQty <= 0) return toast.error("Enter the produced quantity");
    try {
      await produce.mutateAsync({
        product_id: selectedIdFinal,
        produced_qty: producedQty,
        produced_unit: producedUnit,
        note: runNote.trim() || null,
      });
      toast.success("Production recorded — stock updated");
      setProducedQty(0);
      setRunNote("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AdminShell
      title="Production"
      description="Make sauces & batters from raw inventory — ingredients scale and deduct automatically"
      actions={
        <Button onClick={submitRecipe} disabled={saveRecipe.isPending || !selectedIdFinal}>
          <Save className="mr-2 h-4 w-4" />
          Save recipe
        </Button>
      }
    >
      {!category && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          The <span className="font-bold">Sauce &amp; Batter</span> ingredient category is missing.
          Create it in <span className="font-bold">Inventory</span> to use production.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sauce &amp; Batter
          </p>
          <div className="max-h-[52vh] space-y-1 overflow-y-auto">
            {products.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No products yet</p>
            )}
            {products.map((p) => {
              const active = (selectedIdFinal ?? products[0]?.id) === p.id;
              const has = recipes.some((r) => r.product_id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition " +
                    (active
                      ? "bg-primary/12 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")
                  }
                >
                  <span className="truncate">{p.name}</span>
                  {has ? (
                    <FlaskConical className="h-3.5 w-3.5 shrink-0 text-veg" />
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      empty
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
            <Label>New product</Label>
            <Input
              placeholder="Peri Peri Mayo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Select value={newUnit} onValueChange={setNewUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitNames.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="w-full"
              onClick={addProduct}
              disabled={saveIngredient.isPending || !category}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {selected ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      In stock {Number(selected.stock_qty)} {selected.unit} · Batch cost ₹
                      {recipeCost.toFixed(2)} · Cost per {selected.unit} ₹
                      {Number(selected.cost_per_unit).toFixed(2)}
                    </p>
                  </div>
                  {recipe && (
                    <button
                      className="text-sm font-semibold text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        deleteRecipe.mutate(recipe.id, {
                          onSuccess: () => toast.success("Recipe deleted"),
                          onError: (e) => toast.error((e as Error).message),
                        });
                      }}
                    >
                      Delete recipe
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[140px_160px_minmax(0,1fr)]">
                  <div>
                    <Label>Output qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={outputQty}
                      onChange={(e) => setOutputQty(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Output unit</Label>
                    <Select value={outputUnit} onValueChange={setOutputUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitNames.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional method or storage note"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="px-4 py-3">Ingredient</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Line cost</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => {
                        const ing = byId.get(l.ingredient_id);
                        const lineCost = ing
                          ? convertQty(Number(l.qty), l.unit, ing.unit) * Number(ing.cost_per_unit)
                          : 0;
                        return (
                          <tr key={l.key} className="border-b border-border/60 last:border-b-0">
                            <td className="px-4 py-3">
                              <Select
                                value={l.ingredient_id}
                                onValueChange={(v) => {
                                  const picked = byId.get(v);
                                  patch(l.key, {
                                    ingredient_id: v,
                                    unit: picked?.unit ?? l.unit,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rawIngredients.map((i) => (
                                    <SelectItem key={i.id} value={i.id}>
                                      {i.name} ({i.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={l.qty}
                                onChange={(e) => patch(l.key, { qty: Number(e.target.value) })}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={l.unit}
                                onValueChange={(v) => patch(l.key, { unit: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {unitNames.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {u}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 tabular-nums">₹{lineCost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setLines((prev) =>
                                    prev.length > 1
                                      ? prev.filter((x) => x.key !== l.key)
                                      : [newDraft()],
                                  )
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

                <div className="mt-3">
                  <Button
                    variant="secondary"
                    onClick={() => setLines((prev) => [...prev, newDraft()])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add ingredient
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Produce a batch
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[140px_160px_minmax(0,1fr)_auto]">
                  <div>
                    <Label>Produced qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={producedQty}
                      onChange={(e) => setProducedQty(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={producedUnit} onValueChange={setProducedUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitNames.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea
                      rows={1}
                      placeholder="Optional batch note"
                      value={runNote}
                      onChange={(e) => setRunNote(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={runProduction} disabled={produce.isPending || !recipe}>
                      <FlaskConical className="mr-2 h-4 w-4" />
                      Produce
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  Recipe yields {outputQty} {outputUnit}. This batch scales every ingredient by{" "}
                  <span className="font-mono tabular-nums">{scale.toFixed(3)}×</span>.
                </p>

                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="px-4 py-3">Ingredient</th>
                        <th className="px-4 py-3">Required</th>
                        <th className="px-4 py-3">In stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines
                        .filter((l) => l.ingredient_id)
                        .map((l) => {
                          const ing = byId.get(l.ingredient_id);
                          const need = Number(l.qty) * scale;
                          const needStock = ing ? convertQty(need, l.unit, ing.unit) : need;
                          const short = ing ? needStock > Number(ing.stock_qty) : false;
                          return (
                            <tr key={l.key} className="border-b border-border/60 last:border-b-0">
                              <td className="px-4 py-3 font-semibold">{ing?.name ?? "?"}</td>
                              <td
                                className={
                                  "px-4 py-3 font-mono tabular-nums " +
                                  (short ? "text-destructive" : "")
                                }
                              >
                                {need.toFixed(3)} {l.unit}
                              </td>
                              <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                                {Number(ing?.stock_qty ?? 0)} {ing?.unit}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="py-16 text-center text-muted-foreground">
                Add a Sauce &amp; Batter product to start
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Production history
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Produced</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No production recorded yet
                      </td>
                    </tr>
                  )}
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <button
                          className="text-left hover:text-primary"
                          onClick={() => setOpenBatchId(openBatchId === b.id ? null : b.id)}
                        >
                          {b.product_name}
                        </button>
                        {openBatchId === b.id && (
                          <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">
                            {batchItems.map((i) => (
                              <div key={i.id} className="font-mono tabular-nums">
                                {i.ingredient_name} — {Number(i.qty_used).toFixed(3)} {i.unit} (₹
                                {Number(i.line_cost).toFixed(2)})
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {Number(b.produced_qty)} {b.produced_unit}
                      </td>
                      <td className="px-4 py-3 tabular-nums">₹{Number(b.total_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
