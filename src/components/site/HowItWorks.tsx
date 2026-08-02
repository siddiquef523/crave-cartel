import { motion } from "motion/react";
import { MessageCircle, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    icon: UtensilsCrossed,
    title: "Browse the menu",
    body: "Pick your dishes, set quantities and build your bag. No account, no login, no friction.",
  },
  {
    icon: MessageCircle,
    title: "Place your WhatsApp order",
    body: "Checkout generates your order summary and ID, then opens WhatsApp with everything pre-filled.",
  },
  {
    icon: ShoppingBag,
    title: "Pickup & enjoy",
    body: "We confirm your order, cook everything fresh, and have it ready for pickup or deliver it hot in Mahim, Citylight & Bandra.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4">
        <SectionHeading
          eyebrow="How It Works"
          title="Three steps. That's the whole system."
          align="center"
        />

        <div className="relative mt-14">
          <div className="absolute left-6 top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-primary via-border to-transparent sm:block lg:left-0 lg:top-8 lg:h-px lg:w-full lg:bg-gradient-to-r" />

          <ol className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-4 lg:block"
              >
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-background font-display text-lg font-extrabold text-primary">
                  {i + 1}
                </span>
                <div className="lg:mt-6 lg:pr-8">
                  <div className="flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-xl font-bold">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
