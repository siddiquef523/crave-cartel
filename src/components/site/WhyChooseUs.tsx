import { motion } from "motion/react";
import { BadgeIndianRupee, Leaf, Sparkles, Timer } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const FEATURES = [
  {
    icon: Leaf,
    title: "Fresh Ingredients",
    body: "Produce and proteins sourced every morning. Nothing sits overnight, nothing gets reheated twice.",
  },
  {
    icon: Timer,
    title: "Fast Pickup",
    body: "Your order hits the pass in around 20 minutes. Walk up, quote your order ID, walk out.",
  },
  {
    icon: Sparkles,
    title: "Premium Quality",
    body: "Chef-designed recipes, leak-proof insulated packaging, and a kitchen you'd be happy to stand in.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Affordable Pricing",
    body: "No dine-in overheads, no rider commissions. That saving lands on your bill, not ours.",
  },
];

export function WhyChooseUs() {
  return (
    <section id="why" className="scroll-mt-24 border-y border-border bg-surface/30 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4">
        <SectionHeading
          eyebrow="Why Crave Cartel"
          title="A kitchen built for takeaway, not tables."
          description="We removed everything that slows food down — the seating, the waiting, the middlemen."
          align="center"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card-lift group relative overflow-hidden rounded-3xl border border-border bg-card p-6"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <span className="pointer-events-none absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
