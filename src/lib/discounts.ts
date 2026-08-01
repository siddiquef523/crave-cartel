import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MenuItem } from "./menu-data";

/* Untyped escape hatch — same pattern as src/lib/api.ts: the generated
   database types are regenerated only after the marketing/discount SQL is
   applied. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const sb = supabase as any;

/* ------------------------------------------------------------------ types */

export const DISCOUNT_KINDS = ["percentage", "flat"] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

export const DISCOUNT_SCOPES = ["all", "category", "items"] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];

export const DISCOUNT_SCOPE_LABELS: Record<DiscountScope, string> = {
  all: "Entire Website",
  category: "Category",
  items: "Selected Items",
};

export type DiscountRow = {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
  /* target ids, resolved through the join tables */
  category_ids: string[];
  menu_item_ids: string[];
};

export type DiscountInput = {
  id?: string;
  name: string;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  category_ids: string[];
  menu_item_ids: string[];
};

/* ---------------------------------------------------------------- helpers */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** A discount is live when it is enabled and inside its date window. */
export function isDiscountLive(d: DiscountRow, now: Date = new Date()): boolean {
  if (!d.enabled) return false;
  if (d.start_date && new Date(d.start_date).getTime() > now.getTime()) return false;
  if (d.end_date && new Date(d.end_date).getTime() < now.getTime()) return false;
  return true;
}

function matchesTarget(d: DiscountRow, categoryId: string | null, menuItemId: string): boolean {
  if (d.scope === "all") return true;
  if (d.scope === "category") return !!categoryId && d.category_ids.includes(categoryId);
  return d.menu_item_ids.includes(menuItemId);
}

export function discountedPrice(price: number, d: DiscountRow): number {
  const raw =
    d.kind === "percentage" ? price - (price * Number(d.value)) / 100 : price - Number(d.value);
  return Math.max(0, Math.round(raw));
}

export function discountBadge(d: DiscountRow): string {
  return d.kind === "percentage"
    ? `${Number(d.value) % 1 === 0 ? Number(d.value) : Number(d.value).toFixed(2)}% OFF`
    : `₹${Math.round(Number(d.value))} OFF`;
}

/**
 * Picks the discount that applies to a single item: highest priority first,
 * then the one that saves the customer the most money.
 */
export function pickDiscount(
  discounts: DiscountRow[],
  args: { menuItemId: string; categoryId: string | null; price: number },
  now: Date = new Date(),
): DiscountRow | null {
  const candidates = discounts.filter(
    (d) => isDiscountLive(d, now) && matchesTarget(d, args.categoryId, args.menuItemId),
  );
  if (candidates.length === 0) return null;

  /* Deterministic rule, applied in this exact order and independent of the
     order rows arrive in:
       1. highest priority
       2. best saving for the customer
       3. most specific scope (items > category > all)
       4. lowest id (final, stable tie-break) */
  const specificity: Record<DiscountScope, number> = { items: 2, category: 1, all: 0 };

  return candidates.reduce((best, d) => {
    if (d.priority !== best.priority) return d.priority > best.priority ? d : best;

    const p = discountedPrice(args.price, d);
    const pBest = discountedPrice(args.price, best);
    if (p !== pBest) return p < pBest ? d : best;

    if (specificity[d.scope] !== specificity[best.scope])
      return specificity[d.scope] > specificity[best.scope] ? d : best;

    return d.id < best.id ? d : best;
  });
}

/**
 * Applies the best live discount to a menu item. The returned item keeps the
 * original price in `originalPrice` and exposes the payable price in `price`,
 * so cart / checkout / orders / reports all calculate on the discounted value
 * without any further change.
 */
export function applyDiscountToItem(item: MenuItem, discounts: DiscountRow[]): MenuItem {
  const original = item.originalPrice ?? item.price;
  const d = pickDiscount(discounts, {
    menuItemId: item.id,
    categoryId: item.categoryId ?? null,
    price: original,
  });

  if (!d) {
    const { originalPrice: _o, discountLabel: _l, discountId: _i, ...rest } = item;
    return { ...rest, price: original };
  }

  const price = discountedPrice(original, d);
  if (price >= original) {
    const { originalPrice: _o, discountLabel: _l, discountId: _i, ...rest } = item;
    return { ...rest, price: original };
  }

  return {
    ...item,
    price,
    originalPrice: original,
    discountLabel: discountBadge(d),
    discountId: d.id,
  };
}

/* --------------------------------------------------------------- queries */

type RawDiscount = Omit<DiscountRow, "category_ids" | "menu_item_ids"> & {
  discount_categories: { category_id: string }[] | null;
  discount_items: { menu_item_id: string }[] | null;
};

function normalise(rows: RawDiscount[]): DiscountRow[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    value: Number(r.value),
    scope: r.scope,
    enabled: r.enabled,
    start_date: r.start_date,
    end_date: r.end_date,
    priority: r.priority,
    created_at: r.created_at,
    category_ids: (r.discount_categories ?? []).map((c) => c.category_id),
    menu_item_ids: (r.discount_items ?? []).map((i) => i.menu_item_id),
  }));
}

/** All discounts (admin list + public pricing source). */
export function useDiscounts() {
  return useQuery({
    queryKey: ["discounts"],
    staleTime: 60 * 1000,
    queryFn: async () =>
      normalise(
        unwrap(
          await sb
            .from("discounts")
            .select(
              "id, name, kind, value, scope, enabled, start_date, end_date, priority, created_at, discount_categories(category_id), discount_items(menu_item_id)",
            )
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false }),
        ) as RawDiscount[],
      ),
  });
}

/** Only the discounts that are live right now — used for website pricing. */
export function useLiveDiscounts(): DiscountRow[] {
  const { data } = useDiscounts();
  return (data ?? []).filter((d) => isDiscountLive(d));
}

/* ------------------------------------------------------------- mutations */

function useInvalidateDiscounts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["discounts"] });
    qc.invalidateQueries({ queryKey: ["menu_items"] });
  };
}

export function useSaveDiscount() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: async (input: DiscountInput) => {
      const { id, category_ids, menu_item_ids, ...values } = input;

      let discountId = id;
      if (discountId) {
        unwrap(await sb.from("discounts").update(values).eq("id", discountId).select().single());
      } else {
        const created = unwrap(await sb.from("discounts").insert(values).select("id").single()) as {
          id: string;
        };
        discountId = created.id;
      }

      await sb.from("discount_categories").delete().eq("discount_id", discountId);
      await sb.from("discount_items").delete().eq("discount_id", discountId);

      if (input.scope === "category" && category_ids.length) {
        const res = await sb
          .from("discount_categories")
          .insert(category_ids.map((category_id) => ({ discount_id: discountId, category_id })));
        if (res.error) throw new Error(res.error.message);
      }
      if (input.scope === "items" && menu_item_ids.length) {
        const res = await sb
          .from("discount_items")
          .insert(menu_item_ids.map((menu_item_id) => ({ discount_id: discountId, menu_item_id })));
        if (res.error) throw new Error(res.error.message);
      }
    },
    onSuccess: invalidate,
  });
}

export function useToggleDiscount() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await sb.from("discounts").update({ enabled }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteDiscount() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("discounts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
