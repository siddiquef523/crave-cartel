import { motion } from "motion/react";
import { Clock, Instagram, MapPin, Navigation, Phone } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/lib/api";
import { useStoreStatus } from "@/lib/store-status";

export function ContactSection() {
  const { data: settings } = useStoreSettings();
  const { openLabel, closeLabel, statusTitle, isOpen } = useStoreStatus();

  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-border bg-surface/30 py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-4">
        <SectionHeading
          eyebrow="Pickup & Contact"
          title="Come collect it hot."
          description="One counter, one kitchen, one message away."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-5 sm:grid-cols-2"
          >
            <InfoCard icon={MapPin} label="Store address" value={settings?.address ?? ""} />
            <InfoCard icon={Phone} label="Phone" value={settings?.phone ?? ""} />

            <div className="rounded-3xl border border-border bg-card p-6 sm:col-span-2">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Opening hours</span>
              </div>
              <ul className="mt-4 space-y-3">
                <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
                  <span className="min-w-0 truncate text-muted-foreground">Every day</span>
                  <span className="font-semibold tabular-nums">
                    {openLabel} – {closeLabel}
                  </span>
                </li>
                <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 pb-1 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">Right now</span>
                  <span className={`font-semibold ${isOpen ? "text-veg" : "text-primary"}`}>
                    {statusTitle}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <Button asChild variant="whatsapp" size="lg" className="flex-1">
                <a href={`https://wa.me/${settings?.whatsapp ?? ""}`} target="_blank" rel="noreferrer">
                  <WhatsAppIcon />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button asChild variant="ghostline" size="lg" className="flex-1 rounded-2xl">
                <a href={settings?.instagram_url} target="_blank" rel="noreferrer">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.a
            href={settings?.maps_url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="card-lift group relative min-h-[320px] overflow-hidden rounded-3xl border border-border bg-card"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.577_0.245_27.325/0.18),transparent_55%)]" />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-6">
              <span className="w-fit rounded-full glass px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
                Pickup counter
              </span>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-extrabold">Find us on Maps</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">{settings?.address}</p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                  <Navigation className="h-5 w-5" />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="card-lift rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}
