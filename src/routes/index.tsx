import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Hero } from "@/components/site/Hero";
import { BestSellers } from "@/components/site/BestSellers";
import { WhyChooseUs } from "@/components/site/WhyChooseUs";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Reviews } from "@/components/site/Reviews";
import { FaqSection } from "@/components/site/FaqSection";
import { ContactSection } from "@/components/site/ContactSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crave Cartel — Bold Flavours. Fast Pickup." },
      {
        name: "description",
        content:
          "Takeaway-only cloud kitchen serving chef-led burgers, biryani and wings. Order on WhatsApp and collect hot in 20 minutes.",
      },
      { property: "og:title", content: "Crave Cartel — Bold Flavours. Fast Pickup." },
      {
        property: "og:description",
        content: "Takeaway-only cloud kitchen serving chef-led burgers, biryani and wings. Order on WhatsApp and collect hot in 20 minutes.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <Hero />
      <BestSellers />
      <WhyChooseUs />
      <HowItWorks />
      <Reviews />
      <FaqSection />
      <ContactSection />
    </SiteLayout>
  );
}
