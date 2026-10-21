import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aman & Aditi — Our Little Universe" },
      { name: "description", content: "A private cinematic archive of a love story still being written." },
      { property: "og:title", content: "Aman & Aditi — Our Little Universe" },
      { property: "og:description", content: "A private cinematic archive of a love story still being written." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeView,
});
