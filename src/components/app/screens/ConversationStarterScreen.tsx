import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Lock,
  Unlock,
  Sparkles,
  Send,
  Heart,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";

interface ConversationData {
  _id: string;
  question: string;
  date: string;
  bothAnswered: boolean;
  myAnswer: string | null;
  partnerAnswer: string | null;
  partnerAnswered: boolean;
  partnerName: string;
}

export function ConversationStarterScreen() {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = React.useState("");

  const { data, isLoading } = useQuery<ConversationData>({
    queryKey: ["conversationToday"],
    queryFn: async () => {
      const res = await apiClient.get<ConversationData>("/conversations/today");
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiClient.post<any>("/conversations/today", { answer: text });
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["conversationToday"] });
      setAnswer("");
      triggerHaptic("success");
      if (resData.bothAnswered) {
        toast.success("Both answered! Answers revealed ✨");
      } else {
        toast.success("Answer saved privately. Waiting for partner to reveal both 💌");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit answer.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      toast.error("Please type your answer.");
      return;
    }
    submitMutation.mutate(answer.trim());
  };

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Daily Conversation
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Answer separately — revealed when both share
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Loading today's prompt...</div>
      ) : !data ? (
        <div className="py-12 text-center text-xs text-muted-foreground">No prompt found today.</div>
      ) : (
        <>
          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-[#E5A962]/15 via-[#181622] to-[#121118] p-5 shadow-xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-accent/80 mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Today's Question</span>
              </span>
              <span>{data.date}</span>
            </div>

            <h3 className="font-serif text-lg font-medium leading-snug text-foreground">
              "{data.question}"
            </h3>

            <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3 text-[11px]">
              {data.bothAnswered ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Unlocked! Both answers revealed below.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-accent" />
                  <span>
                    {data.myAnswer
                      ? data.partnerAnswered
                        ? "Both ready! Unlocking..."
                        : `Waiting for ${data.partnerName} to answer...`
                      : `Answer privately to see ${data.partnerName}'s thoughts`}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Both Answered: Side by side reveal */}
          {data.bothAnswered ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Partner Answer */}
              <div className="rounded-2xl border border-accent/40 bg-[#1a1726]/90 p-4 shadow-lg backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-accent mb-1.5">
                  <span>{data.partnerName}'s Answer 🤍</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="font-serif text-sm leading-relaxed text-foreground italic">
                  "{data.partnerAnswer}"
                </p>
              </div>

              {/* My Answer */}
              <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                  <span>Your Answer</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="font-serif text-sm leading-relaxed text-foreground italic">
                  "{data.myAnswer}"
                </p>
              </div>
            </motion.div>
          ) : data.myAnswer ? (
            /* User has answered, waiting for partner */
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-accent mb-1.5">
                  <span>Your Answer (Saved)</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="font-serif text-sm leading-relaxed text-foreground italic">
                  "{data.myAnswer}"
                </p>
              </div>

              <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-6 text-center space-y-2">
                <Clock className="h-6 w-6 text-accent mx-auto animate-pulse" />
                <h4 className="text-xs font-bold text-foreground">
                  Waiting for {data.partnerName}
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  {data.partnerAnswered
                    ? `${data.partnerName} has answered! Reloading answers...`
                    : `We'll softly notify you as soon as ${data.partnerName} submits their answer.`}
                </p>
              </div>
            </div>
          ) : (
            /* User has not yet answered */
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Your Answer
                </label>
                <textarea
                  placeholder="Share openly and honestly. Your partner cannot read this until they answer too..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2.5 text-xs font-semibold text-[#0d0d12] shadow-sm shadow-accent/20 transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitMutation.isPending ? "Submitting..." : "Submit Private Answer"}</span>
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
