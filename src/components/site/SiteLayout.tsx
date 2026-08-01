import { useEffect, type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer, FloatingCartButton } from "./CartDrawer";
import { useCart } from "@/lib/cart";
import { useMenu } from "@/lib/api";

/**
 * Keeps the persisted cart aligned with live pricing: when a discount starts
 * or ends, existing cart lines are re-priced automatically.
 */
function CartPriceSync() {
  const { menu } = useMenu();
  const { syncPrices } = useCart();

  useEffect(() => {
    if (menu.length) syncPrices(menu);
  }, [menu, syncPrices]);

  return null;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CartPriceSync />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <FloatingCartButton />
    </div>
  );
}
