import { createFileRoute } from "@tanstack/react-router";
import { SurprisePlannerScreen } from "@/components/app/screens/SurprisePlannerScreen";

export const Route = createFileRoute("/app/surprises")({
  head: () => ({
    meta: [
      { title: "Surprise Planner — Our Space" },
      { name: "description", content: "Secret vault for surprises and gifts." },
    ],
  }),
  component: () => <SurprisePlannerScreen />,
});
