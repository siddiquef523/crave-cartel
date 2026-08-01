import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* Untyped escape hatch — same pattern as src/lib/api.ts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const sb = supabase as any;

/* ------------------------------------------------------------------ types */

export const HERO_BANNER_TYPES = [
  "new_launch",
  "festival_offer",
  "combo_offer",
  "general",
] as const;
export type HeroBannerType = (typeof HERO_BANNER_TYPES)[number];

export const HERO_BANNER_TYPE_LABELS: Record<HeroBannerType, string> = {
  new_launch: "New Launch",
  festival_offer: "Festival Offer",
  combo_offer: "Combo Offer",
  general: "General Announcement",
};

export type HeroBannerRow = {
  id: string;
  enabled: boolean;
  banner_type: HeroBannerType;
  title: string;
  subtitle: string;
  description: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
};

/* ---------------------------------------------------------------- helpers */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Enabled + inside its scheduling window. */
export function isBannerLive(b: HeroBannerRow, now: Date = new Date()): boolean {
  if (!b.enabled) return false;
  if (b.start_date && new Date(b.start_date).getTime() > now.getTime()) return false;
  if (b.end_date && new Date(b.end_date).getTime() < now.getTime()) return false;
  return true;
}

/* --------------------------------------------------------------- queries */

const SELECT =
  "id, enabled, banner_type, title, subtitle, description, primary_button_text, primary_button_link, secondary_button_text, secondary_button_link, image_url, start_date, end_date, priority, created_at";

/** All banners — admin list. */
export function useHeroBanners() {
  return useQuery({
    queryKey: ["hero_banners"],
    staleTime: 60 * 1000,
    queryFn: async () =>
      unwrap(
        await sb
          .from("hero_banners")
          .select(SELECT)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false }),
      ) as HeroBannerRow[],
  });
}

/**
 * The single banner the website should show right now, or null when the
 * homepage must fall back to its built-in default hero.
 */
export function useActiveHeroBanner(): HeroBannerRow | null {
  const { data } = useHeroBanners();
  const live = (data ?? []).filter((b) => isBannerLive(b));
  if (live.length === 0) return null;
  return (
    live.sort(
      (a, b) =>
        b.priority - a.priority ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null
  );
}

/* ------------------------------------------------------------- mutations */

function useInvalidateBanners() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["hero_banners"] });
}

export function useSaveHeroBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: async (input: Partial<HeroBannerRow> & { id?: string }) => {
      const { id, ...values } = input;
      if (id) unwrap(await sb.from("hero_banners").update(values).eq("id", id).select().single());
      else unwrap(await sb.from("hero_banners").insert(values).select().single());
    },
    onSuccess: invalidate,
  });
}

export function useToggleHeroBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await sb.from("hero_banners").update({ enabled }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteHeroBanner() {
  const invalidate = useInvalidateBanners();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("hero_banners").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
