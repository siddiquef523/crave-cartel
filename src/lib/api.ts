import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MenuItem } from "./menu-data";
import { applyDiscountToItem, useLiveDiscounts } from "./discounts";

/* Untyped escape hatch: the generated database types are regenerated only
   after the restaurant-management SQL is applied. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const sb = supabase as any;

/* ------------------------------------------------------------------ types */

export type CategoryRow = {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
  veg: boolean;
  rating: number;
  best_seller: boolean;
  featured: boolean;
  available: boolean;
  sort_order: number;
};

export type StoreSettings = {
  id: boolean;
  store_name: string;
  tagline: string;
  logo_url: string | null;
  hero_banner_url: string | null;
  whatsapp: string;
  phone: string;
  instagram_url: string;
  maps_url: string;
  address: string;
  open_time: string;
  close_time: string;
  time_zone: string;
  store_override: string;
  announcement_text: string;
  announcement_enabled: boolean;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  footer_text: string;
};

export type FaqRow = { id: string; question: string; answer: string; sort_order: number };
export type ReviewRow = {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  sort_order: number;
};

export const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SALES_SOURCES = ["website", "swiggy", "zomato", "walkin"] as const;
export type SalesSource = (typeof SALES_SOURCES)[number];

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  pickup_time: string;
  payment_method: string;
  order_type: string;
  delivery_address: string | null;
  special_instructions: string | null;
  total: number;
  status: OrderStatus;
  source: SalesSource;
  sale_date: string;
  archived: boolean;
  archived_month: string | null;
  created_at: string;
  order_items: {
    id: string;
    name: string;
    price: number;
    qty: number;
    menu_item_id?: string | null;
  }[];
};

export type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  category_id: string | null;
  stock_qty: number;
  low_threshold: number;
  cost_per_unit: number;
  supplier: string | null;
  notes: string | null;
};

/** Optional grouping inside a menu item's recipe. */
export type RecipeSection = "main" | "sauces" | "dip";

export type RecipeRow = {
  menu_item_id: string;
  ingredient_id: string;
  qty_per_unit: number;
  section: RecipeSection;
};

export type InventoryReason = "sale" | "restock" | "waste" | "adjustment" | "reversal";

export type MovementRow = {
  id: string;
  ingredient_id: string;
  delta: number;
  reason: InventoryReason;
  order_id: string | null;
  note: string | null;
  created_at: string;
};

/* --------------------------------------------------------------- helpers */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function toMenuItem(row: MenuItemRow, categoryName: string): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image: row.image_url ?? "/menu/hero-burger.jpg",
    category: categoryName,
    categoryId: row.category_id,
    veg: row.veg,
    rating: Number(row.rating),
    bestSeller: row.best_seller,
    featured: row.featured,
    available: row.available,
  };
}

/* --------------------------------------------------------------- queries */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("categories")
          .select("id, name, image_url, sort_order")
          .order("sort_order", { ascending: true }),
      ) as CategoryRow[],
  });
}

export function useMenuItemRows() {
  return useQuery({
    queryKey: ["menu_items"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("menu_items")
          .select(
            "id, name, description, price, image_url, category_id, veg, rating, best_seller, featured, available, sort_order",
          )
          .order("sort_order", { ascending: true }),
      ) as MenuItemRow[],
  });
}

export function useMenu() {
  const categories = useCategories();
  const items = useMenuItemRows();
  const liveDiscounts = useLiveDiscounts();

  const nameById = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const menu: MenuItem[] = (items.data ?? [])
    .map((row) =>
      toMenuItem(
        row,
        row.category_id ? (nameById.get(row.category_id) ?? "Signatures") : "Signatures",
      ),
    )
    .map((item) => applyDiscountToItem(item, liveDiscounts));

  return {
    menu,
    categories: ["All", ...(categories.data ?? []).map((c) => c.name)],
    isLoading: categories.isLoading || items.isLoading,
  };
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store_settings"],
    queryFn: async () =>
      unwrap(
        await supabase.from("store_settings").select("*").maybeSingle(),
      ) as StoreSettings | null,
  });
}

export function useFaqs() {
  return useQuery({
    queryKey: ["faqs"],
    queryFn: async () =>
      unwrap(
        await supabase.from("faqs").select("*").order("sort_order", { ascending: true }),
      ) as FaqRow[],
  });
}

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () =>
      unwrap(
        await supabase.from("reviews").select("*").order("sort_order", { ascending: true }),
      ) as ReviewRow[],
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    staleTime: 30 * 1000,
    queryFn: async () =>
      unwrap(
        await sb
          .from("orders")
          .select(
            "id, order_number, customer_name, phone, pickup_time, payment_method, order_type, delivery_address, special_instructions, total, status, source, sale_date, archived, archived_month, created_at, order_items(id, name, price, qty, menu_item_id)",
          )
          .order("created_at", { ascending: false }),
      ) as OrderRow[],
  });
}

/* ------------------------------------------------------------- mutations */

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useSaveMenuItem() {
  const invalidate = useInvalidate(["menu_items"]);
  return useMutation({
    mutationFn: async (input: Partial<MenuItemRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id)
        unwrap(await supabase.from("menu_items").update(values).eq("id", id).select().single());
      else
        unwrap(
          await supabase
            .from("menu_items")
            .insert(values as never)
            .select()
            .single(),
        );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMenuItem() {
  const invalidate = useInvalidate(["menu_items"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidate(["categories", "menu_items"]);
  return useMutation({
    mutationFn: async (input: Partial<CategoryRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id)
        unwrap(await supabase.from("categories").update(values).eq("id", id).select().single());
      else
        unwrap(
          await supabase
            .from("categories")
            .insert(values as never)
            .select()
            .single(),
        );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate(["categories", "menu_items"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidate(["store_settings"]);
  return useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      const { error } = await supabase.from("store_settings").update(values).eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidate(["orders"]);
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useArchiveCompletedOrders() {
  const invalidate = useInvalidate(["orders"]);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb.rpc("archive_completed_orders");
      if (error) throw new Error(error.message);
      return (data as number | null) ?? 0;
    },
    onSuccess: invalidate,
  });
}

export function useSaveFaq() {
  const invalidate = useInvalidate(["faqs"]);
  return useMutation({
    mutationFn: async (input: Partial<FaqRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) unwrap(await supabase.from("faqs").update(values).eq("id", id).select().single());
      else
        unwrap(
          await supabase
            .from("faqs")
            .insert(values as never)
            .select()
            .single(),
        );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteFaq() {
  const invalidate = useInvalidate(["faqs"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSaveReview() {
  const invalidate = useInvalidate(["reviews"]);
  return useMutation({
    mutationFn: async (input: Partial<ReviewRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) unwrap(await supabase.from("reviews").update(values).eq("id", id).select().single());
      else
        unwrap(
          await supabase
            .from("reviews")
            .insert(values as never)
            .select()
            .single(),
        );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidate(["reviews"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/* ----------------------------------------------------------- place order */

export type PlaceOrderInput = {
  customer_name: string;
  phone: string;
  pickup_time: string;
  payment_method: string;
  order_type: string;
  delivery_address?: string | null;
  special_instructions?: string;
  total: number;
  items: { menu_item_id: string | null; name: string; price: number; qty: number }[];
};

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const { items, ...order } = input;
  const created = unwrap(
    await supabase
      .from("orders")
      .insert({ ...order, order_number: "pending" } as never)
      .select("id, order_number")
      .single(),
  ) as { id: string; order_number: string };

  const { error } = await supabase
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: created.id })) as never);
  if (error) throw new Error(error.message);

  return created.order_number;
}

/* ---------------------------------------------------------- image upload */

const BUCKET = "menu-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function storagePathFromUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/menu-images\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function uploadImage(
  file: File,
  previousUrl?: string | null,
  folder?: string,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${crypto.randomUUID()}.${ext}`;
  const path = folder ? `${folder}/${name}` : name;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signed.error) throw new Error(signed.error.message);

  const old = storagePathFromUrl(previousUrl);
  if (old) await supabase.storage.from(BUCKET).remove([old]);

  return signed.data.signedUrl;
}

export async function deleteImage(url?: string | null) {
  const path = storagePathFromUrl(url);
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}

/* ============================================================
   Management: ingredients, recipes, movements, external sales
   ============================================================ */

export function useIngredients() {
  return useQuery({
    queryKey: ["ingredients"],
    staleTime: 60 * 1000,
    queryFn: async () =>
      unwrap(await sb.from("ingredients").select("*").order("name")) as IngredientRow[],
  });
}

export function useSaveIngredient() {
  const invalidate = useInvalidate(["ingredients"]);
  return useMutation({
    mutationFn: async (input: Partial<IngredientRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) unwrap(await sb.from("ingredients").update(values).eq("id", id).select().single());
      else unwrap(await sb.from("ingredients").insert(values).select().single());
    },
    onSuccess: invalidate,
  });
}

export function useDeleteIngredient() {
  const invalidate = useInvalidate(["ingredients"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("ingredients").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useRecordStockChange() {
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
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useMovements(limit = 100) {
  return useQuery({
    queryKey: ["movements", limit],
    queryFn: async () =>
      unwrap(
        await sb
          .from("inventory_movements")
          .select("id, ingredient_id, delta, reason, order_id, note, created_at")
          .order("created_at", { ascending: false })
          .limit(limit),
      ) as MovementRow[],
  });
}

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async () => unwrap(await sb.from("recipes").select("*")) as RecipeRow[],
  });
}

export function useSaveRecipeLine() {
  const invalidate = useInvalidate(["recipes"]);
  return useMutation({
    mutationFn: async (row: RecipeRow) => {
      const { error } = await sb.from("recipes").upsert(row);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRecipeLine() {
  const invalidate = useInvalidate(["recipes"]);
  return useMutation({
    mutationFn: async (input: {
      menu_item_id: string;
      ingredient_id: string;
      section: RecipeSection;
    }) => {
      const { error } = await sb
        .from("recipes")
        .delete()
        .eq("menu_item_id", input.menu_item_id)
        .eq("ingredient_id", input.ingredient_id)
        .eq("section", input.section);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

/* ------- External sales entry (Swiggy / Zomato / Walk-in) ------- */

export type ExternalSaleInput = {
  source: Exclude<SalesSource, "website">;
  items: { menu_item_id: string; name: string; price: number; qty: number }[];
  total: number;
  sale_date?: string;
  customer_name?: string;
  note?: string;
};

export function useCreateExternalSale() {
  const invalidate = useInvalidate([
    "orders",
    "ingredients",
    "movements",
    "sales_summary",
    "menu_item_costs",
  ]);
  return useMutation({
    mutationFn: async (input: ExternalSaleInput) => {
      const order = unwrap(
        await sb
          .from("orders")
          .insert({
            customer_name:
              input.customer_name?.trim() ||
              (input.source === "walkin" ? "Walk-in" : `${input.source} order`),
            phone: "-",
            pickup_time: "N/A",
            payment_method: input.source === "walkin" ? "Cash" : "Online",
            order_type: input.source === "walkin" ? "walkin" : "delivery",
            source: input.source,
            total: input.total,
            status: "Completed",
            sale_date: input.sale_date ?? new Date().toISOString().slice(0, 10),
            special_instructions: input.note ?? null,
            order_number: "pending",
          })
          .select("id, order_number")
          .single(),
      ) as { id: string; order_number: string };

      const { error } = await sb
        .from("order_items")
        .insert(input.items.map((i) => ({ ...i, order_id: order.id })));
      if (error) throw new Error(error.message);
      return order.order_number;
    },
    onSuccess: invalidate,
  });
}
