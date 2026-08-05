/* Lifetime VIP discount data layer: admin CRUD over the saved mobile
   numbers plus the public checkout lookup. Same unwrap / useInvalidate
   pattern as api.ts, discounts.ts and production.ts. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

/* ----------------------------------------------------------------- types */

/** Fixed lifetime discount granted to every saved VIP mobile number. */
export const VIP_DISCOUNT_PERCENT = 10;

export type VipCustomerRow = {
  id: string;
  phone: string;
  name: string | null;
  notes: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type VipCustomerInput = {
  id?: string;
  phone: string;
  name: string | null;
  notes: string | null;
  enabled: boolean;
};

/* --------------------------------------------------------------- helpers */

/** Digits only — mobile numbers are compared without spaces / +91 / dashes. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  return normalisePhone(phone).length >= 10;
}

/** Value saved by the VIP discount on a given payable amount. */
export function vipSaving(amount: number): number {
  return Math.round((amount * VIP_DISCOUNT_PERCENT) / 100);
}

/* --------------------------------------------------------------- queries */

const SELECT = "id, phone, name, notes, enabled, created_at, updated_at";

/** Full VIP list (admin only — RLS blocks everyone else). */
export function useVipCustomers() {
  return useQuery({
    queryKey: ["vip_customers"],
    queryFn: async () =>
      unwrap(
        await sb.from("vip_customers").select(SELECT).order("created_at", { ascending: false }),
      ) as VipCustomerRow[],
  });
}

/**
 * Checkout lookup: asks the database whether this mobile number is an active
 * VIP. Uses the `vip_lookup` function so the public site never reads the list.
 */
export function useVipStatus(phone: string) {
  const digits = normalisePhone(phone);
  const enabled = digits.length >= 10;
  return useQuery({
    queryKey: ["vip_lookup", digits],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("vip_lookup", { _phone: digits });
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
  });
}

/* ------------------------------------------------------------- mutations */

export function useSaveVipCustomer() {
  const invalidate = useInvalidate(["vip_customers", "vip_lookup"]);
  return useMutation({
    mutationFn: async (input: VipCustomerInput) => {
      const payload = {
        phone: normalisePhone(input.phone),
        name: input.name?.trim() || null,
        notes: input.notes?.trim() || null,
        enabled: input.enabled,
      };
      if (!isValidPhone(payload.phone)) throw new Error("Enter a valid 10-digit mobile number.");

      const res = input.id
        ? await sb.from("vip_customers").update(payload).eq("id", input.id).select(SELECT).single()
        : await sb.from("vip_customers").insert(payload).select(SELECT).single();

      if (res.error) {
        if (String(res.error.code) === "23505")
          throw new Error("This mobile number is already a VIP customer.");
        throw new Error(res.error.message);
      }
      return res.data as VipCustomerRow;
    },
    onSuccess: invalidate,
  });
}

export function useToggleVipCustomer() {
  const invalidate = useInvalidate(["vip_customers", "vip_lookup"]);
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await sb.from("vip_customers").update({ enabled }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteVipCustomer() {
  const invalidate = useInvalidate(["vip_customers", "vip_lookup"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("vip_customers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
