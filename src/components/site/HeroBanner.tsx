import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-burger.png";
import { HERO_BANNER_TYPE_LABELS, type HeroBannerRow } from "@/lib/marketing";

/**
 * Renders a link with the existing Button styling. Internal paths use the
 * router, anything else (tel:, https://, wa.me links) uses a plain anchor.
 */
function HeroButton({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: "ember" | "ghostline";
}) {
  const internal = href.startsWith("/");
  if (internal) {
    return (
      <Button asChild variant={variant} size="xl">
        <Link to={href}>{children}</Link>
      </Button>
    );
  }
  return (
    <Button asChild variant={variant} size="xl">
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    </Button>
  );
}

/**
 * Admin-controlled split hero. Uses exactly the same layout grammar as the
 * default hero (same grid, same type scale, same image treatment) so the
 * website design language is unchanged.
 */
export function HeroBannerContent({ banner }: { banner: HeroBannerRow }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.05fr_1fr]">
      <div>
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {HERO_BANNER_TYPE_LABELS[banner.banner_type]}
        </motion.span>

        {banner.title && (
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-5 font-display text-[3.1rem] font-extrabold leading-[0.92] sm:text-7xl lg:text-[5.2rem]"
          >
            {banner.title}
          </motion.h1>
        )}

        {banner.subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-4 font-display text-xl font-extrabold text-gradient-ember sm:text-2xl"
          >
            {banner.subtitle}
          </motion.p>
        )}

        {banner.description && (
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {banner.description}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          {banner.primary_button_text && (
            <HeroButton href={banner.primary_button_link || "/menu"} variant="ember">
              {banner.primary_button_text} <ArrowRight className="h-4 w-4" />
            </HeroButton>
          )}
          {banner.secondary_button_text && (
            <HeroButton href={banner.secondary_button_link || "/checkout"} variant="ghostline">
              {banner.secondary_button_text}
            </HeroButton>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-[var(--shadow-lift)]">
          <img
            src={banner.image_url || heroImg}
            alt={banner.title || "Crave Cartel promotion"}
            width={1200}
            height={1408}
            className="h-[380px] w-full object-cover sm:h-[520px]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
