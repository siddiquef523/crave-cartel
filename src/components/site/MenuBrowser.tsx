import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { FoodCard, FoodCardSkeleton } from "./FoodCard";
import { Input } from "@/components/ui/input";
import { useMenu } from "@/lib/api";
import { cn } from "@/lib/utils";

type Diet = "all" | "veg" | "nonveg";

export function MenuBrowser({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [diet, setDiet] = useState<Diet>("all");
  const { menu, categories, isLoading: loading } = useMenu();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesQuery =
        !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      const matchesCategory = category === "All" || item.category === category;
      const matchesDiet = diet === "all" || (diet === "veg" ? item.veg : !item.veg);
      return matchesQuery && matchesCategory && matchesDiet;
    });
  }, [menu, query, category, diet]);

  return (
    <section id="menu" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4">
        {!compact && (
          <SectionHeading
            eyebrow="The Menu"
            title="Everything on the pass."
            description="Search it, filter it, build your bag. Every price you see is the final price — no extra charges at checkout."
            align="center"
          />
        )}

        <div className="mt-10 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search biryani, wings, paneer…"
              className="h-13 rounded-2xl border-border bg-surface pl-11 text-base placeholder:text-muted-foreground/70 focus-visible:ring-primary"
            />
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            {(
              [
                ["all", "Everything"],
                ["veg", "Veg only"],
                ["nonveg", "Non-veg"],
              ] as const
            ).map(([key, label]) => (
              <Chip key={key} active={diet === key} onClick={() => setDiet(key)} small>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <FoodCardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center"
            >
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface">
                <UtensilsCrossed className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-display text-lg font-bold">Nothing matches that craving</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different keyword or clear your filters.
                </p>
              </div>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                  setDiet("all");
                }}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Reset filters
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item, i) => (
                <FoodCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Chip({
  children,
  active,
  onClick,
  small,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border font-semibold transition-all duration-300",
        small ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        active
          ? "border-primary bg-primary text-primary-foreground ember-glow"
          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
