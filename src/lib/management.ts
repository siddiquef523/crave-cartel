/* Restaurant-management data layer: inventory masters, stock-in, movement
   history, low stock, gross-profit costing, monthly cycle + report archive.
   Kept separate from api.ts so the customer website stays untouched. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InventoryReason, SalesSource } from "./api";

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

export type UnitRow = { id: string; name: string; sort_order: number };
export type IngredientCategoryRow = { id: string; name: string; sort_order: number };

export type MovementDetailRow = {
  id: string;
  ingredient_id: string;
  delta: number;
  reason: InventoryReason;
  order_id: string | null;
  unit_cost: number | null;
  supplier: string | null;
  note: string | null;
  created_at: string;
};

export type MenuItemCostRow = {
  menu_item_id: string;
  name: string;
  price: number;
  unit_cost: number;
};

export type BusinessCycleRow = {
  id: string;
  month: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  note: string | null;
};

export type MonthlyReportRow = {
  id: string;
  month: string;
  revenue: number;
  orders_count: number;
  items_sold: number;
  cogs: number;
  gross_profit: number;
  avg_order_value: number;
  by_source: { source: SalesSource; revenue: number; orders: number }[];
  top_items: { name: string; qty: number; revenue: number }[];
  created_at: string;
};

export type SalesSummary = {
  revenue: number;
  orders_count: number;
  items_sold: number;
  cogs: number;
  gross_profit: number;
  avg_order_value: number;
};

const FIVE_MIN = 5 * 60 * 1000;

/* ----------------------------------------------------- inventory masters */

export function useUnits() {
  return useQuery({
    queryKey: ["inventory_units"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb.from("inventory_units").select("id, name, sort_order").order("sort_order"),
      ) as UnitRow[],
  });
}

export function useSaveUnit() {
  const invalidate = useInvalidate(["inventory_units"]);
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; sort_order?: number }) => {
      const { id, ...values } = input;
      if (id)
        unwrap(await sb.from("inventory_units").update(values).eq("id", id).select().single());
      else unwrap(await sb.from("inventory_units").insert(values).select().single());
    },
    onSuccess: invalidate,
  });
}

export function useDeleteUnit() {
  const invalidate = useInvalidate(["inventory_units"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("inventory_units").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useIngredientCategories() {
  return useQuery({
    queryKey: ["ingredient_categories"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb.from("ingredient_categories").select("id, name, sort_order").order("sort_order"),
      ) as IngredientCategoryRow[],
  });
}

export function useSaveIngredientCategory() {
  const invalidate = useInvalidate(["ingredient_categories", "ingredients"]);
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; sort_order?: number }) => {
      const { id, ...values } = input;
      if (id)
        unwrap(
          await sb.from("ingredient_categories").update(values).eq("id", id).select().single(),
        );
      else unwrap(await sb.from("ingredient_categories").insert(values).select().single());
    },
    onSuccess: invalidate,
  });
}

export function useDeleteIngredientCategory() {
  const invalidate = useInvalidate(["ingredient_categories", "ingredients"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("ingredient_categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/* ------------------------------------------------------------- stock in */

export type StockInLine = {
  ingredient_id: string;
  qty: number;
  unit_cost?: number | null;
  supplier?: string | null;
  note?: string | null;
};

export function useStockIn() {
  const invalidate = useInvalidate(["ingredients", "movements"]);
  return useMutation({
    mutationFn: async (lines: StockInLine[]) => {
      for (const line of lines) {
        const { error } = await sb.rpc("record_stock_change", {
          _ingredient_id: line.ingredient_id,
          _delta: Math.abs(line.qty),
          _reason: "restock",
          _note: line.note ?? null,
          _unit_cost: line.unit_cost ?? null,
          _supplier: line.supplier ?? null,
        });
        if (error) throw new Error(error.message);
      }
      return lines.length;
    },
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidate(["ingredients", "movements"]);
  return useMutation({
    mutationFn: async (input: {
      ingredient_id: string;
      delta: number;
      reason: InventoryReason;
      note?: string | null;
    }) => {
      const { error } = await sb.rpc("record_stock_change", {
        _ingredient_id: input.ingredient_id,
        _delta: input.delta,
        _reason: input.reason,
        _note: input.note ?? null,
        _unit_cost: null,
        _supplier: null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/* ---------------------------------------------------- movement history */

export function useMovementHistory(filters: {
  ingredientId?: string;
  reason?: InventoryReason | "all";
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { ingredientId, reason = "all", from, to, limit = 500 } = filters;
  return useQuery({
    queryKey: ["movements", ingredientId ?? "all", reason, from ?? "", to ?? "", limit],
    staleTime: 60_000,
    queryFn: async () => {
      let q = sb
        .from("inventory_movements")
        .select("id, ingredient_id, delta, reason, order_id, unit_cost, supplier, note, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (ingredientId) q = q.eq("ingredient_id", ingredientId);
      if (reason !== "all") q = q.eq("reason", reason);
      if (from) q = q.gte("created_at", `${from}T00:00:00`);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      return unwrap(await q) as MovementDetailRow[];
    },
  });
}

/* ----------------------------------------------------------- costing */

export function useMenuItemCosts() {
  return useQuery({
    queryKey: ["menu_item_costs"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb.from("menu_item_costs").select("menu_item_id, name, price, unit_cost"),
      ) as MenuItemCostRow[],
  });
}

/* -------------------------------------------------- monthly cycle */

export function useBusinessCycles() {
  return useQuery({
    queryKey: ["business_cycles"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb.from("business_cycles").select("*").order("month", { ascending: false }),
      ) as BusinessCycleRow[],
  });
}

export function useMonthlyReports() {
  return useQuery({
    queryKey: ["monthly_reports"],
    staleTime: FIVE_MIN,
    queryFn: async () =>
      unwrap(
        await sb.from("monthly_reports").select("*").order("month", { ascending: false }),
      ) as MonthlyReportRow[],
  });
}

export function useCloseMonth() {
  const invalidate = useInvalidate(["monthly_reports", "business_cycles", "orders"]);
  return useMutation({
    mutationFn: async (month: string) => {
      const { data, error } = await sb.rpc("close_business_month", { _month: month });
      if (error) throw new Error(error.message);
      return data as MonthlyReportRow;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMonthlyReport() {
  const invalidate = useInvalidate(["monthly_reports"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("monthly_reports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSalesSummary(from: string, to: string) {
  return useQuery({
    queryKey: ["sales_summary", from, to],
    staleTime: 60_000,
    enabled: Boolean(from && to),
    queryFn: async () => {
      const { data, error } = await sb.rpc("sales_summary", { _from: from, _to: to });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? {
        revenue: 0,
        orders_count: 0,
        items_sold: 0,
        cogs: 0,
        gross_profit: 0,
        avg_order_value: 0,
      }) as SalesSummary;
    },
  });
}

/* ------------------------------------------------------------ helpers */

export function monthKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}
