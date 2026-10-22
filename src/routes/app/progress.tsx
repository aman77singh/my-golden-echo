import { createFileRoute } from "@tanstack/react-router";
import { ProgressScreen } from "@/components/app/screens/ProgressScreen";

export const Route = createFileRoute("/app/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Our Space" },
      { name: "description", content: "Shared milestones, streaks and cheers." },
    ],
  }),
  component: ProgressScreen,
});
