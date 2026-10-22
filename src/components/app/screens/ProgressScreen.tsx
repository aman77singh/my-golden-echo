import { motion } from "motion/react";
import { Plus, Flame, Award, Heart, MessageSquare, Sparkles } from "lucide-react";

export function ProgressScreen() {
  const posts = [
    {
      id: "1",
      author: "Aditi",
      category: "Fitness & Wellness",
      body: "Ran 5k in the morning mist! Felt tired at km 3 but pushed through remembering our evening date 🏃‍♀️✨",
      minutes: 32,
      countAdded: 5,
      unit: "km",
      struggled: true,
      time: "2 hours ago",
      replies: [
        {
          author: "Aman",
          body: "So proud of you my rockstar! You inspire me every single day ❤️",
          quickCheer: "🏆",
        },
      ],
      reactions: ["👏", "❤️", "🔥"],
    },
    {
      id: "2",
      author: "Aman",
      category: "Reading Together",
      body: "Finished chapter 4 of our book. Left little sticky notes on the pages that made me think of you 📖☕",
      minutes: 45,
      countAdded: 24,
      unit: "pages",
      time: "Yesterday",
      replies: [],
      reactions: ["🥰", "✨"],
    },
  ];

  return (
    <div className="space-y-5 pb-28">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Our Progress
          </h2>
          <p className="text-xs text-muted-foreground">Growing together, one milestone at a time</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-2 text-xs font-semibold text-[#0d0d12] shadow-md transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Update</span>
        </button>
      </div>

      {/* Shared Streak Widget */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-accent/30 bg-gradient-to-r from-[#1b1a26] via-[#23202e] to-[#1b1a26] p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-[#0d0d12] shadow-lg shadow-accent/20">
              <Flame className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-2xl font-bold text-foreground">18 Days</span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                  Streak
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Shared habit momentum is on fire!</p>
            </div>
          </div>
          <Award className="h-6 w-6 text-accent/80" />
        </div>
      </motion.div>

      {/* Progress Posts Stream */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-3xl border border-white/5 bg-[#16161f]/80 p-5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 font-bold text-xs text-accent">
                  {post.author[0]}
                </div>
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground">{post.author}</h4>
                  <p className="text-[10px] text-muted-foreground">{post.time}</p>
                </div>
              </div>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium text-accent">
                {post.category}
              </span>
            </div>

            <p className="mt-3.5 text-sm text-foreground/90 leading-relaxed font-sans">{post.body}</p>

            {/* Metrics Chips */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {post.minutes && (
                <span className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-1 text-muted-foreground">
                  ⏱️ {post.minutes} mins
                </span>
              )}
              {post.countAdded && (
                <span className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-1 text-muted-foreground">
                  🎯 +{post.countAdded} {post.unit}
                </span>
              )}
              {post.struggled && (
                <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                  💪 Overcame struggle
                </span>
              )}
            </div>

            {/* Reactions and Cheering Bar */}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5">
                {post.reactions.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex h-7 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 text-xs hover:border-accent/40"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/20 text-muted-foreground text-xs hover:border-accent/50 hover:text-accent"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-accent font-medium hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{post.replies.length} Cheer</span>
              </button>
            </div>

            {/* Replies List */}
            {post.replies.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                {post.replies.map((reply, rIdx) => (
                  <div
                    key={rIdx}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-2.5 text-xs text-foreground/80 flex items-start gap-2"
                  >
                    <span className="text-base">{reply.quickCheer}</span>
                    <div className="flex-1">
                      <span className="font-semibold text-accent">{reply.author}: </span>
                      <span>{reply.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </div>
  );
}
