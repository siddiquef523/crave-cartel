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
  price: number;
  image: string;
  category: string;
  veg: boolean;
  rating: number;
  bestSeller?: boolean;
  featured?: boolean;
  available?: boolean;
};

export const formatINR = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
