import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const REVIEWS = [
  {
    name: "Unaiza Qureshi",
    handle: "Verified Customer",
    rating: 5,
    body: "Tried the Cartel Boss Burger and it was honestly really good. The patty was juicy, the sauce had a unique taste, and the fries were fresh and crispy. Packaging was neat and the food reached in great condition. Will definitely order again.",
    initials: "UQ",
  },
  {
    name: "Gazala Shaikh",
    handle: "Late Night Foodie",
    rating: 5,
    body: "Ordered late at night and the food was surprisingly fresh. The burger was loaded with flavor and the portions were worth the price. One of the better late-night food options I've tried recently.",
    initials: "GS",
  },
  {
    name: "Rohan Mehta",
    handle: "Burger Lover",
    rating: 4,
    body: "Loved the quality of the ingredients. Everything tasted fresh and well balanced, especially the signature sauce. Fast service, good packaging, and reasonable prices. Looking forward to trying the pizzas next time.",
    initials: "RM",
  },
];

export function Reviews() {
  return (
    <section
      id="reviews"
      className="scroll-mt-24 border-y border-border bg-surface/30 py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-4">
        <SectionHeading
          eyebrow="Reviews"
          title="What the regulars say."
          description="Real feedback from people who collect their order at our counter every week."
          align="center"
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-lift relative overflow-hidden rounded-3xl border border-border bg-card p-6"
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-primary/15" />
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={
                      s < r.rating ? "h-3.5 w-3.5 fill-gold text-gold" : "h-3.5 w-3.5 text-muted"
                    }
                  />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                “{r.body}”
              </blockquote>
              <figcaption className="mt-6 flex min-w-0 items-center gap-3 border-t border-border pt-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-extrabold text-background">
                  {r.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.handle}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
