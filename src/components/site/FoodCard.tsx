import { motion } from "motion/react";
import { Minus, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, type MenuItem } from "@/lib/menu-data";
import { useCart } from "@/lib/cart";
import { useOrderingEnabled } from "@/lib/store-status";
import { cn } from "@/lib/utils";

export function VegBadge({ veg }: { veg: boolean }) {
  return (
    <span
      className={cn(
        "grid h-5 w-5 place-items-center rounded-[5px] border",
        veg ? "border-veg text-veg" : "border-primary text-primary",
      )}
      title={veg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  );
}

export function FoodCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const { add, decrement, qtyOf } = useCart();
  const qty = qtyOf(item.id);
  const ordering = useOrderingEnabled();
  const soldOut = item.available === false || !ordering;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
      className="card-lift group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          width={800}
          height={600}
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-110",
            item.available === false && "opacity-40 grayscale",
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

        {item.bestSeller && (
          <span className="absolute left-0 top-4 rounded-r-full bg-primary py-1.5 pl-3 pr-4 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]">
            Best Seller
          </span>
        )}

        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full glass px-2.5 py-1 text-xs font-semibold">
          <Star className="h-3 w-3 fill-gold text-gold" />
          {item.rating}
        </span>

        {item.available === false && (
          <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex min-w-0 items-start gap-2">
          <VegBadge veg={item.veg} />
          <h3 className="min-w-0 flex-1 font-display text-lg font-bold leading-tight">
            {item.name}
          </h3>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="font-display text-xl font-extrabold">{formatINR(item.price)}</span>

          {qty === 0 ? (
            <Button
              variant="ember"
              size="sm"
              disabled={soldOut}
              onClick={() => add(item)}
              title={!ordering ? "Store is currently closed" : undefined}
              className="rounded-full"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          ) : (
            <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-surface-2 p-1">
              <button
                aria-label="Decrease quantity"
                onClick={() => decrement(item.id)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => add(item)}
                className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function FoodCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-surface-2" />
        <div className="h-3.5 w-full animate-pulse rounded-full bg-surface-2" />
        <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-surface-2" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-surface-2" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
