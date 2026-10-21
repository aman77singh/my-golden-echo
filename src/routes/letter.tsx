import { createFileRoute } from "@tanstack/react-router";
import { LetterView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/letter")({
  head: () => ({
    meta: [
      { title: "A Letter To You — Aman & Aditi" },
      { name: "description", content: "For all the things I mean, even when I forget to say them." },
    ],
  }),
  component: LetterView,
});
