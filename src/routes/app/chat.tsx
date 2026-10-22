import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "@/components/app/screens/ChatScreen";

export const Route = createFileRoute("/app/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Our Space" },
      { name: "description", content: "Private couple chat and voice notes." },
    ],
  }),
  component: ChatScreen,
});
