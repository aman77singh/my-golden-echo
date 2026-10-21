import { createFileRoute } from "@tanstack/react-router";
import { PhotosView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Photo Dump — Aman & Aditi" },
      { name: "description", content: "Twenty little windows into the same unfolding story." },
    ],
  }),
  component: PhotosView,
});
