import { createFileRoute } from "@tanstack/react-router";
import { DateJarScreen } from "@/components/app/screens/DateJarScreen";

export const Route = createFileRoute("/app/datejar")({
  head: () => ({
    meta: [
      { title: "Date Jar — Our Space" },
      { name: "description", content: "Romantic date ideas and random adventure picker." },
    ],
  }),
  component: () => <DateJarScreen />,
});
