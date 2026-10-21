import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SecretView, requiredSections } from "@/components/relationship/RelationshipPortfolio";

export const Route = createFileRoute("/secret")({
  head: () => ({
    meta: [
      { title: "One Last Thing — Aman & Aditi" },
      { name: "description", content: "A special hidden chapter for exploring our story." },
    ],
  }),
  component: SecretRouteGuard,
});

function SecretRouteGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("visited-sections");
      const visitedSet = saved ? new Set(JSON.parse(saved)) : new Set();
      const isUnlocked = requiredSections.every((id) => visitedSet.has(id));
      if (!isUnlocked) {
        navigate({ to: "/" });
      }
    } catch {
      navigate({ to: "/" });
    }
  }, [navigate]);

  return <SecretView />;
}
