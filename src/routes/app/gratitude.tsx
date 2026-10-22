import { createFileRoute } from "@tanstack/react-router";
import { GratitudeJarScreen } from "@/components/app/screens/GratitudeJarScreen";

export const Route = createFileRoute("/app/gratitude")({
  head: () => ({
    meta: [
      { title: "Gratitude Jar — Our Space" },
      { name: "description", content: "Little daily notes of love and appreciation." },
    ],
  }),
  component: () => <GratitudeJarScreen />,
});
