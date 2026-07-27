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
    a: "No. Crave Cartel is a cloud kitchen — takeaway only. There is no dine-in area, no table booking and no reservations. You collect your order at the pickup counter.",
  },
  {
    q: "How do I place an order?",
    a: "Build your bag on the site, go to checkout, and hit the WhatsApp button. Your full order summary and order ID are pre-filled in the message. Our team confirms it and gives you a pickup time.",
  },
  {
    q: "Do you deliver?",
    a: "We don't run our own delivery fleet. Every order is prepared for pickup at our kitchen counter.",
  },
  {
    q: "When do I pay?",
    a: "Your choice at checkout. Pay First means we send a UPI QR code on WhatsApp after you submit. Pay at Pickup means you settle with UPI, cash or card when you collect.",
  },
  {
    q: "Can I customise a dish?",
    a: "Yes — use the special instructions box at checkout. Things like 'no onion', 'less spicy' or 'extra cheese' go straight to the kitchen ticket.",
  },
  {
    q: "How long does an order take?",
    a: "Most orders are ready in about 20 minutes. Large or peak-hour orders may take a little longer — we always confirm the exact time on WhatsApp.",
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
