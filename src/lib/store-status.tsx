import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStoreSettings, useSaveSettings } from "@/lib/api";

export type OverrideMode = "auto" | "open" | "closed";

export type StoreHours = {
  /** 24h "HH:mm" */
  openTime: string;
  /** 24h "HH:mm" — may be earlier than openTime (crosses midnight) */
  closeTime: string;
  timeZone: string;
  override: OverrideMode;
};

export const DEFAULT_HOURS: StoreHours = {
  openTime: "18:00",
  closeTime: "03:00",
  timeZone: "Asia/Kolkata",
  override: "auto",
};

export const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatTimeLabel(hhmm: string) {
  const total = toMinutes(hhmm);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Current minutes-since-midnight in the given IANA time zone. */
export function minutesNowInZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return (h % 24) * 60 + m;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

/** Handles overnight windows: open 18:00 → close 03:00 next day. */
export function isWithinHours(nowMinutes: number, openTime: string, closeTime: string) {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (open === close) return true; // 24 hours
  if (open < close) return nowMinutes >= open && nowMinutes < close;
  return nowMinutes >= open || nowMinutes < close;
}

type StoreStatusValue = {
  hours: StoreHours;
  /** Persists the change to Supabase store_settings (admin only — RLS enforced). */
  setHours: (next: Partial<StoreHours>) => void;
  isOpen: boolean;
  /** true once store settings have loaded and the client clock has been read */
  ready: boolean;
  saving: boolean;
  openLabel: string;
  closeLabel: string;
  statusTitle: string;
  statusDetail: string;
  closedMessage: string;
};

const StoreStatusContext = createContext<StoreStatusValue | null>(null);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useStoreSettings();
  const saveSettings = useSaveSettings();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const hours: StoreHours = useMemo(
    () =>
      settings
        ? {
            openTime: settings.open_time,
            closeTime: settings.close_time,
            timeZone: settings.time_zone,
            override: (settings.store_override as OverrideMode) || "auto",
          }
        : DEFAULT_HOURS,
    [settings],
  );

  const setHours = (next: Partial<StoreHours>) => {
    saveSettings.mutate({
      ...(next.openTime !== undefined ? { open_time: next.openTime } : {}),
      ...(next.closeTime !== undefined ? { close_time: next.closeTime } : {}),
      ...(next.timeZone !== undefined ? { time_zone: next.timeZone } : {}),
      ...(next.override !== undefined ? { store_override: next.override } : {}),
    });
  };

  const value = useMemo<StoreStatusValue>(() => {
    const ready = now !== null && !isLoading && !!settings;
    const auto = ready
      ? isWithinHours(minutesNowInZone(now!, hours.timeZone), hours.openTime, hours.closeTime)
      : true;
    const isOpen =
      hours.override === "open" ? true : hours.override === "closed" ? false : auto;

    const openLabel = formatTimeLabel(hours.openTime);
    const closeLabel = formatTimeLabel(hours.closeTime);

    return {
      hours,
      setHours,
      isOpen,
      ready,
      saving: saveSettings.isPending,
      openLabel,
      closeLabel,
      statusTitle: isOpen ? "Open Now" : "Currently Closed",
      statusDetail: isOpen ? `Closes at ${closeLabel}` : `Opens Today at ${openLabel}`,
      closedMessage: `We're currently closed. Orders will reopen today at ${openLabel}.`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, now, isLoading, settings, saveSettings.isPending]);

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  if (!ctx) throw new Error("useStoreStatus must be used within StoreStatusProvider");
  return ctx;
}

/** Ordering allowed only when open and settings have loaded on the client. */
export function useOrderingEnabled() {
  const { isOpen, ready } = useStoreStatus();
  return ready && isOpen;
}
