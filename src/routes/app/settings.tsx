import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen } from "@/components/app/screens/SettingsScreen";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Notifications — Our Space" },
      { name: "description", content: "Notification preferences and quiet hours for Aman & Aditi." },
    ],
  }),
  component: () => <SettingsScreen />,
});
