import { createFileRoute } from "@tanstack/react-router";
import { WeeklyCheckInScreen } from "@/components/app/screens/WeeklyCheckInScreen";

export const Route = createFileRoute("/app/checkin")({
  head: () => ({
    meta: [
      { title: "Weekly Check-in — Our Space" },
      { name: "description", content: "Weekly ratings and one gentle thing to improve." },
    ],
  }),
  component: () => <WeeklyCheckInScreen />,
});
