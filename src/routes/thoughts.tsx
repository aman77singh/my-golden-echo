import { createFileRoute } from "@tanstack/react-router";
import { ThoughtsView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/thoughts")({
  head: () => ({
    meta: [
      { title: "Random Thoughts — Aman & Aditi" },
      { name: "description", content: "Things I never want to forget." },
    ],
  }),
  component: ThoughtsView,
});
