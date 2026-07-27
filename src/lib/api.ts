import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MenuItem } from "./menu-data";

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

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  pickup_time: string;
  payment_method: string;
  special_instructions: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: { id: string; name: string; price: number; qty: number }[];
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

/** Menu shaped exactly like the original static MenuItem list. */
export function useMenu() {
  const categories = useCategories();
  const items = useMenuItemRows();

  const nameById = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const menu: MenuItem[] = (items.data ?? []).map((row) =>
    toMenuItem(row, row.category_id ? (nameById.get(row.category_id) ?? "Signatures") : "Signatures"),
  );

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
      unwrap(await supabase.from("store_settings").select("*").maybeSingle()) as StoreSettings | null,
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
    queryFn: async () =>
      unwrap(
        await supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, phone, pickup_time, payment_method, special_instructions, total, status, created_at, order_items(id, name, price, qty)",
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
      if (id) unwrap(await supabase.from("menu_items").update(values).eq("id", id).select().single());
      else unwrap(await supabase.from("menu_items").insert(values as never).select().single());
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
      if (id) unwrap(await supabase.from("categories").update(values).eq("id", id).select().single());
      else unwrap(await supabase.from("categories").insert(values as never).select().single());
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

export function useSaveFaq() {
  const invalidate = useInvalidate(["faqs"]);
  return useMutation({
    mutationFn: async (input: Partial<FaqRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) unwrap(await supabase.from("faqs").update(values).eq("id", id).select().single());
      else unwrap(await supabase.from("faqs").insert(values as never).select().single());
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
      else unwrap(await supabase.from("reviews").insert(values as never).select().single());
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

/** Uploads an image, removes the previous one, returns a long-lived URL. */
export async function uploadImage(file: File, previousUrl?: string | null): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

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

