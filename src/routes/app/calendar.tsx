import { createFileRoute } from "@tanstack/react-router";
import { CalendarScreen } from "@/components/app/screens/CalendarScreen";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({
    meta: [
      { title: "Shared Calendar — Our Space" },
      { name: "description", content: "Milestones, dates, and cycle predictions." },
    ],
  }),
  component: () => <CalendarScreen />,
});
