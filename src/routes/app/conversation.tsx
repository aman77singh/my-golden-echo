import { createFileRoute } from "@tanstack/react-router";
import { ConversationStarterScreen } from "@/components/app/screens/ConversationStarterScreen";

export const Route = createFileRoute("/app/conversation")({
  head: () => ({
    meta: [
      { title: "Daily Conversation Starter — Our Space" },
      { name: "description", content: "Daily questions revealed once both have answered." },
    ],
  }),
  component: () => <ConversationStarterScreen />,
});
