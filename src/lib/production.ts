/* Sauce & Batter production data layer: production recipes (bill of
   materials for in-house products), automatic ingredient scaling and the
   production batch history. Kept separate from management.ts the same way
   management.ts is kept separate from api.ts. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IngredientRow } from "./api";

/* eslint-disable @typescript-eslint/no-explicit-any */
const sb = supabase as any;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/* --------------------------------------------------------------- types */

/** Ingredient category that holds finished in-house products. */
export const SAUCE_BATTER_CATEGORY = "Sauce & Batter";

export type ProductionRecipeItemRow = {
  id: string;
  production_recipe_id: string;
  ingredient_id: string;
  qty: number;
  unit: string;
};

export type ProductionRecipeRow = {
  id: string;
  product_id: string;
  output_qty: number;
  output_unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionBatchRow = {
  id: string;
  product_id: string;
  product_name: string;
  produced_qty: number;
  produced_unit: string;
  recipe_output_qty: number;
  recipe_output_unit: string;
  scale_factor: number;
  total_cost: number;
  note: string | null;
  created_at: string;
};

export type ProductionBatchItemRow = {
  id: string;
  batch_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  qty_used: number;
  unit: string;
  unit_cost: number;
  line_cost: number;
};

export type ProductionRecipeLineInput = {
  ingredient_id: string;
  qty: number;
  unit: string;
};

const FIVE_MIN = 5 * 60 * 1000;

/* ------------------------------------------------------------- helpers */

/** Mirrors public.convert_qty in the database so the UI previews match. */
export function convertQty(qty: number, from: string, to: string): number {
  const f = (from ?? "").trim().toLowerCase();
  const t = (to ?? "").trim().toLowerCase();
  if (!f || !t || f === t) return qty;
  if (f === "kg" && t === "g") return qty * 1000;
  if (f === "g" && t === "kg") return qty / 1000;
  if (f === "litre" && t === "ml") return qty * 1000;
  if (f === "ml" && t === "litre") return qty / 1000;
  if (f === "dozen" && t === "pcs") return qty * 12;
  if (f === "pcs" && t === "dozen") return qty / 12;
  return qty;
}

/** Scale factor applied to every recipe line for a given produced amount. */
export function productionScale(
  producedQty: number,
  producedUnit: string,
  outputQty: number,
  outputUnit: string,
): number {
  const outInProduced = convertQty(outputQty, outputUnit, producedUnit);
  if (!outInProduced) return 0;
  return producedQty / outInProduced;
}

/** Ingredients that live in the Sauce & Batter category. */
export function filterProducts(
  ingredients: IngredientRow[],
  categoryId: string | null | undefined,
) {
  if (!categoryId) return [] as IngredientRow[];
  return ingredients.filter((i) => i.category_id === categoryId);
}

/* ------------------------------------------------------------- queries */

export function useProductionRecipes() {
  return useQuery({
    queryKey: ["production_recipes"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb
          .from("production_recipes")
          .select("id, product_id, output_qty, output_unit, notes, created_at, updated_at"),
      ) as ProductionRecipeRow[],
  });
}

export function useProductionRecipeItems() {
  return useQuery({
    queryKey: ["production_recipe_items"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb
          .from("production_recipe_items")
          .select("id, production_recipe_id, ingredient_id, qty, unit"),
      ) as ProductionRecipeItemRow[],
  });
}

export function useProductionBatches(limit = 200) {
  return useQuery({
    queryKey: ["production_batches", limit],
    staleTime: 60_000,
    queryFn: async () =>
      unwrap(
        await sb
          .from("production_batches")
          .select(
            "id, product_id, product_name, produced_qty, produced_unit, recipe_output_qty, recipe_output_unit, scale_factor, total_cost, note, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(limit),
      ) as ProductionBatchRow[],
  });
}

export function useProductionBatchItems(batchId: string | null) {
  return useQuery({
    queryKey: ["production_batch_items", batchId ?? ""],
    enabled: Boolean(batchId),
    staleTime: 60_000,
    queryFn: async () =>
      unwrap(
        await sb
          .from("production_batch_items")
          .select(
            "id, batch_id, ingredient_id, ingredient_name, qty_used, unit, unit_cost, line_cost",
          )
          .eq("batch_id", batchId),
      ) as ProductionBatchItemRow[],
  });
}

/* ----------------------------------------------------------- mutations */

/** Creates or updates the recipe header and replaces its ingredient lines. */
export function useSaveProductionRecipe() {
  const invalidate = useInvalidate(["production_recipes", "production_recipe_items"]);
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      product_id: string;
      output_qty: number;
      output_unit: string;
      notes?: string | null;
      lines: ProductionRecipeLineInput[];
    }) => {
      const { id, lines, ...values } = input;
      const header = id
        ? (unwrap(
            await sb.from("production_recipes").update(values).eq("id", id).select("id").single(),
          ) as { id: string })
        : (unwrap(await sb.from("production_recipes").insert(values).select("id").single()) as {
            id: string;
          });

      const { error: delError } = await sb
        .from("production_recipe_items")
        .delete()
        .eq("production_recipe_id", header.id);
      if (delError) throw new Error(delError.message);

      const clean = lines.filter((l) => l.ingredient_id && Number(l.qty) > 0);
      if (clean.length > 0) {
        const { error } = await sb.from("production_recipe_items").insert(
          clean.map((l) => ({
            production_recipe_id: header.id,
            ingredient_id: l.ingredient_id,
            qty: Number(l.qty),
            unit: l.unit,
          })),
        );
        if (error) throw new Error(error.message);
      }
      return header.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProductionRecipe() {
  const invalidate = useInvalidate(["production_recipes", "production_recipe_items"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("production_recipes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/** Runs a production batch: scales, deducts raw stock, adds finished stock. */
export function useRecordProduction() {
  const invalidate = useInvalidate([
    "ingredients",
    "movements",
    "production_batches",
    "menu_item_costs",
  ]);
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      produced_qty: number;
      produced_unit: string;
      note?: string | null;
    }) => {
      const { data, error } = await sb.rpc("record_production", {
        _product_id: input.product_id,
        _produced_qty: input.produced_qty,
        _produced_unit: input.produced_unit,
        _note: input.note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: invalidate,
  });
}
