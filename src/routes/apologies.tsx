import { createFileRoute } from "@tanstack/react-router";
import { ApologiesView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/apologies")({
  head: () => ({
    meta: [
      { title: "My Apologies — Aman & Aditi" },
      { name: "description", content: "Some words deserve to be uncovered slowly." },
    ],
  }),
  component: ApologiesView,
});
