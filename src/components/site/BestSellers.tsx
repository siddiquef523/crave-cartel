import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { FoodCard, FoodCardSkeleton } from "./FoodCard";
import { Button } from "@/components/ui/button";
import { useMenu } from "@/lib/api";

export function BestSellers() {
  const { menu, isLoading } = useMenu();
  const items = menu.filter((i) => i.bestSeller);
  return (
    <section id="bestsellers" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SectionHeading
            eyebrow="Most Ordered"
            title={
              <>
                The plates people
                <br className="hidden sm:block" /> keep coming back for.
              </>
            }
            description="Four dishes carry the kitchen. These are them — cooked fresh, packed hot, ready for pickup."
          />
          <Button asChild variant="ghostline" className="w-fit">
            <Link to="/menu">
              Full Menu <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <FoodCardSkeleton key={i} />)
            : items.map((item, i) => <FoodCard key={item.id} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}
