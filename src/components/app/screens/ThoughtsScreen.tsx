import React from "react";
import { motion } from "motion/react";
import { Lock, Globe, Plus, Heart, Sparkles, MessageCircle } from "lucide-react";

export function ThoughtsScreen() {
  const [filter, setFilter] = React.useState<"all" | "shared" | "private">("all");

  const thoughts = [
    {
      id: "1",
      author: "Aditi",
      kind: "thought",
      visibility: "shared",
      body: "Looking at old photos of our first rainy drive today. My heart felt so warm knowing how much we've built since then.",
      justVenting: false,
      date: "Today, 11:20 AM",
      responses: [
        {
          author: "Aman",
          emoji: "❤️",
          note: "I fell in love with you all over again that day.",
        },
      ],
    },
    {
      id: "2",
      author: "Aditi",
      kind: "insecurity",
      visibility: "shared",
      body: "Sometimes I worry I get too quiet when I'm overwhelmed and that you might feel pushed away.",
      justVenting: false,
      date: "Yesterday",
      responses: [
        {
          author: "Aman",
          emoji: "🫂",
          note: "I understand your quiet, love. You never have to explain yourself.",
        },
      ],
    },
    {
      id: "3",
      author: "Aditi",
      kind: "thought",
      visibility: "private",
      body: "Secret birthday gift brainstorming for Aman. Keep this completely private! 🎁",
      justVenting: false,
      date: "3 days ago",
      responses: [],
    },
  ];

  const filtered = thoughts.filter((t) => {
    if (filter === "shared") return t.visibility === "shared";
    if (filter === "private") return t.visibility === "private";
    return true;
  });

  return (
    <div className="space-y-5 pb-28">
      {/* Header with New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Thoughts &amp; Vulnerability
          </h2>
          <p className="text-xs text-muted-foreground">A safe space for honesty and tender words</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-2 text-xs font-semibold text-[#0d0d12] shadow-md transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-2xl border border-white/5 bg-[#16161f]/80 p-1 backdrop-blur-md">
        {(["all", "shared", "private"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`flex-1 rounded-xl py-1.5 text-xs font-medium capitalize transition-all ${
              filter === tab
                ? "bg-accent/20 text-accent font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Thoughts Feed */}
      <div className="space-y-4">
        {filtered.map((thought, idx) => (
          <motion.div
            key={thought.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`rounded-3xl border p-5 shadow-lg backdrop-blur-md ${
              thought.visibility === "private"
                ? "border-amber-500/20 bg-[#19171b]/80"
                : "border-white/5 bg-[#16161f]/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    thought.kind === "insecurity"
                      ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                      : "border border-accent/30 bg-accent/10 text-accent"
                  }`}
                >
                  {thought.kind}
                </span>
                <span className="text-[10px] text-muted-foreground">{thought.date}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {thought.visibility === "private" ? (
                  <span className="flex items-center gap-1 text-amber-300/80">
                    <Lock className="h-3 w-3" />
                    <span>Private</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400/80">
                    <Globe className="h-3 w-3" />
                    <span>Shared</span>
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3.5 text-sm text-foreground/90 leading-relaxed font-serif italic">
              "{thought.body}"
            </p>

            {/* Partner Response */}
            {thought.responses.length > 0 && (
              <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    <span>{thought.responses[0].author}'s Response</span>
                  </div>
                  <span className="text-base">{thought.responses[0].emoji}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/80 font-sans leading-relaxed">
                  {thought.responses[0].note}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
