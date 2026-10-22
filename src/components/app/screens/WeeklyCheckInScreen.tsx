import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  HeartHandshake,
  Star,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Smile,
  Shield,
  Send,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";
import { IWeeklyCheckIn } from "@/types/shared";

export function WeeklyCheckInScreen() {
  const queryClient = useQueryClient();
  const [comm, setComm] = React.useState(5);
  const [intimacy, setIntimacy] = React.useState(5);
  const [fun, setFun] = React.useState(5);
  const [support, setSupport] = React.useState(5);
  const [highlight, setHighlight] = React.useState("");
  const [oneThing, setOneThing] = React.useState("");

  const { data: checkins = [], isLoading } = useQuery<IWeeklyCheckIn[]>({
    queryKey: ["weeklyCheckins"],
    queryFn: async () => {
      const res = await apiClient.get<IWeeklyCheckIn[]>("/checkins");
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<IWeeklyCheckIn>("/checkins", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyCheckins"] });
      setHighlight("");
      setOneThing("");
      triggerHaptic("success");
      toast.success("Weekly check-in submitted with love 💛");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit check-in.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneThing.trim()) {
      toast.error("Please share one gentle thing to nurture or improve.");
      return;
    }
    submitMutation.mutate({
      ratings: {
        communication: comm,
        intimacy,
        fun,
        support,
      },
      highlight: highlight.trim() || undefined,
      oneThingToImprove: oneThing.trim(),
    });
  };

  const RatingRow = ({
    label,
    icon: Icon,
    value,
    onChange,
  }: {
    label: string;
    icon: any;
    value: number;
    onChange: (n: number) => void;
  }) => (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onChange(star);
            }}
            className={`p-1 transition-transform active:scale-90 ${
              star <= value ? "text-[#E5A962]" : "text-white/20"
            }`}
          >
            <Star className={`h-4 w-4 ${star <= value ? "fill-current" : ""}`} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <HeartHandshake className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Weekly Check-in
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Gentle ratings and one thing to nurture together
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How Was Our Week? (1 - 5)
        </h3>

        <div className="divide-y divide-white/5 space-y-1">
          <RatingRow label="Communication" icon={MessageSquare} value={comm} onChange={setComm} />
          <RatingRow label="Closeness & Intimacy" icon={Sparkles} value={intimacy} onChange={setIntimacy} />
          <RatingRow label="Fun & Playfulness" icon={Smile} value={fun} onChange={setFun} />
          <RatingRow label="Mutual Support" icon={Shield} value={support} onChange={setSupport} />
        </div>

        <div className="space-y-3 pt-2 border-t border-white/5">
          <div>
            <label className="text-xs font-medium text-foreground">Highlight of the Week</label>
            <input
              type="text"
              placeholder="e.g. Cooking together on Friday night"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              One Thing to Improve or Nurture <span className="text-accent">*</span>
            </label>
            <textarea
              placeholder="e.g. Let's do 15 minutes of device-free cuddle time before sleep"
              value={oneThing}
              onChange={(e) => setOneThing(e.target.value)}
              rows={2}
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2.5 text-xs font-semibold text-[#0d0d12] shadow-sm shadow-accent/20 transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{submitMutation.isPending ? "Submitting..." : "Submit Weekly Reflection"}</span>
        </button>
      </form>

      {/* History */}
      <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Past Reflections
        </h3>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading reflections...</div>
        ) : checkins.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No reflections logged yet. Start this week together!
          </div>
        ) : (
          <div className="space-y-3">
            {checkins.map((item) => {
              const avg = (
                (item.ratings.communication +
                  item.ratings.intimacy +
                  item.ratings.fun +
                  item.ratings.support) /
                4
              ).toFixed(1);

              return (
                <div
                  key={item._id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-2 hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                    <span className="font-mono">Week of {item.weekStart}</span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent font-bold">
                      ⭐ {avg} / 5.0
                    </span>
                  </div>

                  {item.highlight && (
                    <p className="text-foreground">
                      <span className="text-accent font-semibold">Highlight:</span> {item.highlight}
                    </p>
                  )}

                  <p className="text-foreground">
                    <span className="text-[#E07A5F] font-semibold">To Nurture:</span>{" "}
                    {item.oneThingToImprove}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
