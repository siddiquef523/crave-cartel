import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Clock, Star, UtensilsCrossed } from "lucide-react";
import heroImg from "@/assets/hero-burger.jpg";
import { Button } from "@/components/ui/button";
import { useActiveHeroBanner } from "@/lib/marketing";
import { HeroBannerContent } from "./HeroBanner";

export function Hero() {
  // Admin-controlled promotional banner. When no banner is enabled (or it is
  // outside its schedule) the original default hero below is rendered.
  const banner = useActiveHeroBanner();

  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
      {/* animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="ember-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/30" />
        <div
          className="ember-orb absolute -right-16 top-52 h-80 w-80 rounded-full bg-gold/15"
          style={{ animationDelay: "-6s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/0.06),transparent_60%)]" />
      </div>

      {banner ? (
        <HeroBannerContent banner={banner} />
      ) : (
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-veg" />
              Cloud Kitchen · Pickup & Delivery
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-5 font-display text-[3.1rem] font-extrabold leading-[0.92] sm:text-7xl lg:text-[5.2rem]"
            >
              Bold Flavours.
              <span className="block text-gradient-ember">Fast Pickup.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Chef-led food cooked to order in our cloud kitchen. Send your order on WhatsApp,
              collect it hot in 20 minutes. No queues, no dine-in, no compromise.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button asChild variant="ember" size="xl">
                <Link to="/menu">
                  Browse Menu <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghostline" size="xl">
                <Link to="/checkout">Order Now</Link>
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6"
            >
              {[
                { k: "20 min", v: "Avg. pickup" },
                { k: "200+", v: "Orders packed" },
                { k: "4.9★", v: "Rated by locals" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-extrabold">{s.k}</dt>
                  <dd className="mt-0.5 text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-[var(--shadow-lift)]">
              <img
                src={heroImg}
                alt="Crave Cartel signature double smash burger"
                width={1200}
                height={1408}
                className="h-[380px] w-full object-cover sm:h-[520px]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>

            {/* floating review badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="glass absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl px-4 py-3 sm:left-8"
            >
              <div className="flex -space-x-2">
                {["A", "R", "M"].map((c) => (
                  <span
                    key={c}
                    className="grid h-8 w-8 place-items-center rounded-full border border-background bg-surface-2 text-xs font-bold"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">200+ happy pickups</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="glass absolute -top-4 right-3 hidden items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-semibold sm:flex"
            >
              <Clock className="h-4 w-4 text-primary" />
              Ready in 20 min
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* marquee */}
      <div className="mt-16 overflow-hidden border-y border-border py-4">
        <div className="marquee-track flex w-max gap-10">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {[
                "Fresh Daily Prep",
                "Zero Dine-In",
                "WhatsApp Ordering",
                "Chef-Led Kitchen",
                "Hot Pickup",
                "Premium Packaging",
              ].map((t) => (
                <span
                  key={t + dup}
                  className="flex items-center gap-3 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
