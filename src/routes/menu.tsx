import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { MenuBrowser } from "@/components/site/MenuBrowser";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Crave Cartel Cloud Kitchen" },
      {
        name: "description",
        content:
          "Browse the full Crave Cartel menu: signatures, starters, mains, sides, desserts and drinks. Filter by veg or non-veg and order on WhatsApp.",
      },
      { property: "og:title", content: "Menu — Crave Cartel Cloud Kitchen" },
      {
        property: "og:description",
        content: "Signatures, starters, mains and more. Takeaway only, ordered on WhatsApp.",
      },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  return (
    <SiteLayout>
      <div className="pt-20">
        <MenuBrowser />
      </div>
    </SiteLayout>
  );
}
