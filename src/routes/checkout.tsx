import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Info,
  Loader2,
  QrCode,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/site/WhatsAppIcon";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart";
import { useOrderingEnabled } from "@/lib/store-status";
import { StoreClosedBanner } from "@/components/site/StoreStatus";
import { formatINR } from "@/lib/menu-data";
import { placeOrder, useStoreSettings } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Crave Cartel" },
      {
        name: "description",
        content:
          "Confirm your Crave Cartel takeaway order: pickup time, payment preference and special instructions, then send it on WhatsApp.",
      },
      { property: "og:title", content: "Checkout — Crave Cartel" },
      {
        property: "og:description",
        content: "Review your bag and send your pickup order over WhatsApp.",
      },
    ],
  }),
  component: CheckoutPage,
});

const PICKUP_SLOTS = ["ASAP (20 min)", "In 30 minutes", "In 45 minutes", "In 1 hour"];
const EXAMPLES = ["No onion", "Less spicy", "Extra cheese", "Pack cutlery"];

function CheckoutPage() {
  const { lines, subtotal, total, clear } = useCart();
  const { data: settings } = useStoreSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState(PICKUP_SLOTS[0]);
  const [payment, setPayment] = useState<"first" | "pickup">("first");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  const ordering = useOrderingEnabled();
  const canSubmit =
    ordering &&
    !placing &&
    !placedOrderNumber &&
    name.trim().length > 1 &&
    phone.trim().length >= 10 &&
    lines.length > 0;

  function buildWhatsAppBody(orderNumber: string) {
    return [
      `*New Pickup Order — ${settings?.store_name ?? "Crave Cartel"}*`,
      `Order ID: ${orderNumber}`,
      "",
      `Name: ${name || "-"}`,
      `Phone: ${phone || "-"}`,
      `Pickup: ${slot}`,
      `Payment: ${payment === "first" ? "Pay First (UPI)" : "Pay at Pickup"}`,
      "",
      "*Items*",
      ...lines.map((l) => `• ${l.qty} × ${l.item.name} — ${formatINR(l.item.price * l.qty)}`),
      "",
      `Subtotal: ${formatINR(subtotal)}`,
      `*Grand Total: ${formatINR(total)}*`,
      notes ? `\nInstructions: ${notes}` : "",
    ].join("\n");
  }

  async function handlePlaceOrder() {
    if (!canSubmit || !settings) return;

    // Open the tab synchronously (inside the click handler) so browsers don't
    // treat it as a blocked popup once we `await` the order insert below.
    const pendingWindow = window.open("", "_blank");
    setPlacing(true);

    try {
      const orderNumber = await placeOrder({
        customer_name: name.trim(),
        phone: phone.trim(),
        pickup_time: slot,
        payment_method: payment === "first" ? "Pay First" : "Pay at Pickup",
        special_instructions: notes.trim() || undefined,
        total,
        items: lines.map((l) => ({
          menu_item_id: l.item.id,
          name: l.item.name,
          price: l.item.price,
          qty: l.qty,
        })),
      });

      const waLink = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
        buildWhatsAppBody(orderNumber),
      )}`;

      if (pendingWindow) pendingWindow.location.href = waLink;
      else window.open(waLink, "_blank");

      setPlacedOrderNumber(orderNumber);
      clear();
    } catch (e) {
      pendingWindow?.close();
      toast.error(e instanceof Error ? e.message : "Couldn't place your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  const showEmptyState = lines.length === 0 && !placedOrderNumber;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-28 sm:pt-32">
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </Link>

        <h1 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">Checkout</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Takeaway only. We confirm every order on WhatsApp before we start cooking.
        </p>

        <StoreClosedBanner className="mt-6" />

        {placedOrderNumber && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-veg/30 bg-veg/10 px-4 py-3 text-sm font-medium text-veg">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            Order {placedOrderNumber} placed — finish sending the message on WhatsApp to confirm
            with the kitchen.
          </div>
        )}

        {showEmptyState ? (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">Nothing to check out yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a few dishes and come right back.
              </p>
            </div>
            <Button asChild variant="ember">
              <Link to="/menu">Browse Menu</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-7"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    disabled={!!placedOrderNumber}
                    className="h-12 rounded-xl border-border bg-surface"
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    value={phone}
                    inputMode="tel"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    disabled={!!placedOrderNumber}
                    className="h-12 rounded-xl border-border bg-surface"
                  />
                </Field>
              </div>

              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" /> Pickup time
                </p>
                <div className="flex flex-wrap gap-2">
                  {PICKUP_SLOTS.map((s) => (
                    <button
                      key={s}
                      disabled={!!placedOrderNumber}
                      onClick={() => setSlot(s)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300",
                        slot === s
                          ? "border-primary bg-primary text-primary-foreground ember-glow"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Wallet className="h-4 w-4 text-primary" /> Payment option
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PayOption
                    active={payment === "first"}
                    onClick={() => setPayment("first")}
                    title="Pay First"
                    subtitle="UPI QR sent on WhatsApp"
                  />
                  <PayOption
                    active={payment === "pickup"}
                    onClick={() => setPayment("pickup")}
                    title="Pay at Pickup"
                    subtitle="UPI, cash or card at counter"
                  />
                </div>

                <motion.div
                  key={payment}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 flex gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4"
                >
                  {payment === "first" ? (
                    <QrCode className="h-5 w-5 shrink-0 text-primary" />
                  ) : (
                    <Info className="h-5 w-5 shrink-0 text-primary" />
                  )}
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {payment === "first"
                      ? "After submitting your order on WhatsApp, our team will send you a UPI QR Code for payment confirmation."
                      : "You can pay using UPI, Cash or Card while collecting your order."}
                  </p>
                </motion.div>
              </div>

              <div>
                <Field label="Special instructions">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    disabled={!!placedOrderNumber}
                    placeholder="Tell the kitchen anything — allergies, spice level, packing requests…"
                    className="min-h-32 rounded-xl border-border bg-surface text-base"
                  />
                </Field>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((e) => (
                    <button
                      key={e}
                      disabled={!!placedOrderNumber}
                      onClick={() => setNotes((n) => (n ? `${n}, ${e}` : e))}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      + {e}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* summary */}
            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="h-fit space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold">Order Summary</h2>
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                  {placedOrderNumber ?? "Draft"}
                </span>
              </div>

              <ul className="space-y-3">
                {(lines.length ? lines : []).map((l) => (
                  <li key={l.item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {l.qty} × {l.item.name}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatINR(l.item.price * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <Separator className="bg-border" />

              <div className="space-y-2.5 text-sm">
                <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
                <SummaryRow label="Packaging & taxes" value="Included" />
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold">Grand Total</span>
                <span className="font-display text-3xl font-extrabold text-primary">
                  {formatINR(total)}
                </span>
              </div>

              <Button
                variant="whatsapp"
                size="xl"
                disabled={!canSubmit}
                className="w-full"
                onClick={handlePlaceOrder}
              >
                {placing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <WhatsAppIcon className="h-5 w-5" />
                )}
                {placedOrderNumber ? "Order Sent" : "Send Order on WhatsApp"}
              </Button>

              {!canSubmit && !placedOrderNumber && (
                <p className="text-center text-xs text-muted-foreground">
                  {ordering
                    ? "Add your name and phone number to continue."
                    : "Ordering is paused while the kitchen is closed."}
                </p>
              )}

              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-veg" />
                Pickup only from {settings?.address ?? "our kitchen counter"}
              </p>
            </motion.aside>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function PayOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-surface hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2",
          active ? "border-primary" : "border-muted-foreground",
        )}
      >
        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
