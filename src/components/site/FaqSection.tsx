import { SectionHeading } from "./SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do you have seating or dine-in?",
    a: "No. Crave Cartel is a cloud kitchen, so we don't offer dine-in, table bookings or reservations. You can place an order for pickup or enjoy delivery in Mahim, Citylight and Bandra.",
  },
  {
    q: "How do I place an order?",
    a: "Build your bag on the site, go to checkout, and hit the WhatsApp button. Your full order summary and order ID are pre-filled in the message. Our team confirms your order, shares the payment details, and provides an estimated delivery or pickup time.",
  },
  {
    q: "Do you deliver?",
    a: "Yes. We currently deliver only in Mahim, Citylight and Bandra. Orders outside these areas are available for pickup from our kitchen.",
  },
  {
    q: "When do I pay?",
    a: "All orders are prepaid. After you place your order through WhatsApp, we'll send you a UPI QR code for payment. Your order is confirmed and prepared once the payment is received.",
  },
  {
    q: "Can I customise a dish?",
    a: "Yes — use the special instructions box at checkout. Things like 'no onion', 'less spicy' or 'extra cheese' go straight to the kitchen ticket.",
  },
  {
    q: "How long does an order take?",
    a: "Most orders are ready in about 20 minutes. Large or peak-hour orders may take a little longer — we always confirm the exact time on WhatsApp.",
  },
  {
    q: "Which areas do you deliver to?",
    a: "We currently deliver only in Mahim, Citylight and Bandra. We're working on expanding to more locations soon.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered straight."
          description="Anything else, message us on WhatsApp — we reply fast during kitchen hours."
        />

        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="border-b border-border last:border-b-0"
            >
              <AccordionTrigger className="py-5 text-left font-display text-base font-bold hover:no-underline data-[state=open]:text-primary">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
