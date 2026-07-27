import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const REVIEWS = [
  {
    name: "Aarav Mehta",
    handle: "Picked up 14 times",
    rating: 5,
    body: "The double smash is genuinely better than places charging twice as much. Order on WhatsApp, done in 18 minutes.",
    initials: "AM",
  },
  {
    name: "Rhea Kapoor",
    handle: "Regular since launch",
    rating: 5,
    body: "Packaging is spotless — nothing leaks, everything is still hot when I get home. That alone earns my loyalty.",
    initials: "RK",
  },
  {
    name: "Imran Sheikh",
    handle: "Office lunch orders",
    rating: 4,
    body: "I order for eight people every Friday. One message, one pickup, zero chaos. The biryani disappears first.",
    initials: "IS",
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
