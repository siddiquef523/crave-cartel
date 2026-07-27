import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu as MenuIcon, ShoppingBag, X } from "lucide-react";
import { Logo } from "./Logo";
import { StoreStatusBadge } from "./StoreStatus";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Home", to: "/", hash: "" },
  { label: "Menu", to: "/menu", hash: "" },
  { label: "About", to: "/", hash: "why" },
  { label: "Contact", to: "/", hash: "contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, setOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4">
        <nav
          className={cn(
            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-500 sm:px-4",
            scrolled ? "glass shadow-[0_18px_50px_-30px_black]" : "border border-transparent",
          )}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo />
            <StoreStatusBadge className="hidden sm:flex" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <ul className="hidden items-center gap-1 md:flex">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    hash={l.hash || undefined}
                    className="relative rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeOptions={{ exact: true, includeHash: false }}
                    activeProps={{ className: "text-foreground" }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setOpen(true)}
              aria-label="Open cart"
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface transition-all duration-300 hover:border-primary/60 hover:bg-surface-2"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <Button asChild variant="ember" size="sm" className="hidden sm:inline-flex">
              <Link to="/menu">Order Now</Link>
            </Button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface md:hidden"
            >
              {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <MenuIcon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="glass mt-2 overflow-hidden rounded-2xl p-2 md:hidden"
            >
              <StoreStatusBadge className="mb-1 w-full sm:hidden" />
              {LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  hash={l.hash || undefined}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
