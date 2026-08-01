// Shared types and formatting helpers for menu items.
//
// The actual menu, category and store data now live in Supabase — see
// src/lib/api.ts (useMenu, useCategories, useStoreSettings, etc.). This file
// only keeps the `MenuItem` shape (used by the cart and food-card
// components) and the currency formatter, both of which are still reused
// across static/mocked and live data.

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  /** Payable price — already discounted when a discount is live. */
  price: number;
  image: string;
  category: string;
  /** Category id, used by the discount engine (src/lib/discounts.ts). */
  categoryId?: string | null;
  veg: boolean;
  rating: number;
  bestSeller?: boolean;
  featured?: boolean;
  available?: boolean;
  /** Set only when a discount applies — the pre-discount menu price. */
  originalPrice?: number;
  /** Badge text such as "20% OFF" / "₹50 OFF". */
  discountLabel?: string;
  /** Id of the discount that produced `price`. */
  discountId?: string;
};

export const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
