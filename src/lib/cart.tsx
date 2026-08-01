import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type MenuItem } from "@/lib/menu-data";

export type CartLine = { item: MenuItem; qty: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (item: MenuItem) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  qtyOf: (id: string) => number;
  /** Re-price cart lines from the live (discount-aware) menu. */
  syncPrices: (items: MenuItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "crave-cartel-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      subtotal,
      total: subtotal,
      open,
      setOpen,
      qtyOf: (id) => lines.find((l) => l.item.id === id)?.qty ?? 0,
      add: (item) =>
        setLines((prev) => {
          const found = prev.find((l) => l.item.id === item.id);
          if (found) return prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
          return [...prev, { item, qty: 1 }];
        }),
      decrement: (id) =>
        setLines((prev) =>
          prev
            .map((l) => (l.item.id === id ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        ),
      remove: (id) => setLines((prev) => prev.filter((l) => l.item.id !== id)),
      clear: () => setLines([]),
      syncPrices: (items) =>
        setLines((prev) => {
          let changed = false;
          const next = prev.map((l) => {
            const fresh = items.find((i) => i.id === l.item.id);
            if (!fresh) return l;
            if (
              fresh.price === l.item.price &&
              (fresh.originalPrice ?? null) === (l.item.originalPrice ?? null) &&
              (fresh.discountLabel ?? null) === (l.item.discountLabel ?? null)
            )
              return l;
            changed = true;
            return { ...l, item: fresh };
          });
          return changed ? next : prev;
        }),
    };
  }, [lines, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
