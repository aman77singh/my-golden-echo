import { createFileRoute } from "@tanstack/react-router";
import { CycleScreen } from "@/components/app/screens/CycleScreen";

export const Route = createFileRoute("/app/cycle")({
  head: () => ({
    meta: [
      { title: "Cycle — Our Space" },
      { name: "description", content: "Cycle tracking and wellness care." },
    ],
  }),
  component: CycleScreen,
});
