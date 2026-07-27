import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer, FloatingCartButton } from "./CartDrawer";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <FloatingCartButton />
    </div>
  );
}
