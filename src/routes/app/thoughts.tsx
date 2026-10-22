import { createFileRoute } from "@tanstack/react-router";
import { ThoughtsScreen } from "@/components/app/screens/ThoughtsScreen";

export const Route = createFileRoute("/app/thoughts")({
  head: () => ({
    meta: [
      { title: "Thoughts — Our Space" },
      { name: "description", content: "Safe vulnerable reflections and loving replies." },
    ],
  }),
  component: ThoughtsScreen,
});
