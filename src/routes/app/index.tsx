import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/app/screens/HomeScreen";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Home — Our Space" },
      { name: "description", content: "Daily connection and love notes." },
    ],
  }),
  component: HomeScreen,
});
