import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/menu-data";
import { useOrderingEnabled } from "@/lib/store-status";
import { StoreClosedBanner } from "./StoreStatus";

export function CartDrawer() {
  const { open, setOpen, lines, add, decrement, remove, subtotal, total, count } = useCart();
  const ordering = useOrderingEnabled();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-lg font-extrabold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Bag
            {count > 0 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {count} item{count > 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border border-border bg-surface">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">Your bag is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add something bold from the menu and pick it up hot.
              </p>
            </div>
            <Button asChild variant="ember" onClick={() => setOpen(false)}>
              <Link to="/menu">Browse Menu</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <motion.div
                    key={line.item.id}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <img
                      src={line.item.image}
                      alt={line.item.name}
                      loading="lazy"
                      width={128}
                      height={128}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{line.item.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                        <span>{formatINR(line.item.price)}</span>
                        {line.item.originalPrice != null &&
                          line.item.originalPrice > line.item.price && (
                            <>
                              <span className="line-through opacity-70">
                                {formatINR(line.item.originalPrice)}
                              </span>
                              {line.item.discountLabel && (
                                <span className="rounded-full bg-veg/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-veg">
                                  {line.item.discountLabel}
                                </span>
                              )}
                            </>
                          )}
                      </p>

                      <div className="mt-2 flex items-center gap-1 rounded-full border border-border bg-surface-2 p-0.5 w-fit">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() => decrement(line.item.id)}
                          className="grid h-6 w-6 place-items-center rounded-full hover:bg-surface"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">
                          {line.qty}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() => add(line.item)}
                          className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      aria-label={`Remove ${line.item.name}`}
                      onClick={() => remove(line.item.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="space-y-3 border-t border-border bg-surface/50 px-5 py-5">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold">Grand Total</span>
                <span className="font-display text-2xl font-extrabold text-primary">
                  {formatINR(total)}
                </span>
              </div>
              <StoreClosedBanner />
              {ordering ? (
                <Button asChild variant="ember" size="lg" className="w-full">
                  <Link to="/checkout" onClick={() => setOpen(false)}>
                    Checkout
                  </Link>
                </Button>
              ) : (
                <Button variant="ember" size="lg" className="w-full" disabled>
                  Checkout
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Takeaway only · Order confirmed over WhatsApp
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function FloatingCartButton() {
  const { count, setOpen, total } = useCart();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground ember-glow transition-transform hover:scale-[1.03] sm:bottom-7"
        >
          <ShoppingBag className="h-4 w-4" />
          {count} item{count > 1 ? "s" : ""}
          <span className="h-4 w-px bg-primary-foreground/30" />
          {formatINR(total)}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
