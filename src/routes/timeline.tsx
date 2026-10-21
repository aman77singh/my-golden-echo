import { createFileRoute } from "@tanstack/react-router";
import { TimelineView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Our Timeline — Aman & Aditi" },
      { name: "description", content: "Every chapter left a mark. Not a perfect story. A true one." },
    ],
  }),
  component: TimelineView,
});
