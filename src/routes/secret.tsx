import { createFileRoute } from "@tanstack/react-router";
import { SecretView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/secret")({
  head: () => ({
    meta: [
      { title: "One Last Thing — Aman & Aditi" },
      { name: "description", content: "A special hidden chapter for exploring our story." },
    ],
  }),
  component: SecretView,
});
