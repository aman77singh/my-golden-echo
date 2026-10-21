import { createFileRoute } from "@tanstack/react-router";
import { MusicView } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Our Soundtrack — Aman & Aditi" },
      { name: "description", content: "Some memories begin with a song." },
    ],
  }),
  component: MusicViewRoute,
});

function MusicViewRoute() {
  return <MusicView activeTrack={0} />;
}
