import { Link } from "@tanstack/react-router";
import { Instagram, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { Logo } from "./Logo";
import { useStoreSettings } from "@/lib/api";

export function Footer() {
  const { data: settings } = useStoreSettings();
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            A takeaway-only cloud kitchen. Chef-led food, packed hot, ordered straight over
            WhatsApp.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { label: "Home", to: "/", hash: "" },
              { label: "Menu", to: "/menu", hash: "" },
              { label: "How it works", to: "/", hash: "how" },
              { label: "Contact", to: "/", hash: "contact" },
            ].map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  hash={l.hash || undefined}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Pickup Point
          </h4>
          <p className="mt-4 flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {settings?.address}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            {settings?.phone}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Follow
          </h4>
          <div className="mt-4 flex gap-2.5">
            <a
              href={`https://wa.me/${settings?.whatsapp ?? ""}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-veg/60 hover:text-veg"
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </a>
            <a
              href={settings?.instagram_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:text-primary"
            >
              <Instagram className="h-[18px] w-[18px]" />
            </a>
          </div>
          <Link
            to="/admin/login"
            className="mt-6 inline-block text-xs text-muted-foreground/60 transition-colors hover:text-primary"
          >
            Admin login
          </Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Crave Cartel. Takeaway only · No dine-in · Orders via
          WhatsApp.
        </p>
      </div>
    </footer>
  );
}
