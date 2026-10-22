import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Sparkles,
  MessageCircle,
  Flame,
  Calendar,
  Zap,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  SmilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, getStoredUser } from "@/lib/api";
import { getDailyLoveNote } from "@/config";
import { SetMoodSheet } from "./SetMoodSheet";
import { MoodHistoryModal } from "./MoodHistoryModal";

interface Mood {
  _id: string;
  coupleId: string;
  userId: string;
  emoji: string;
  energy: number;
  note?: string;
  createdAt: string;
}

interface LatestMoodsResponse {
  mine: Mood | null;
  partner: Mood | null;
  partnerName: string;
}

interface CoupleResponse {
  couple: {
    _id: string;
    startDate: string;
  };
  user: {
    _id: string;
    name: string;
    role: "her" | "him";
    email: string;
  };
  partner: {
    _id: string;
    name: string;
    role: "her" | "him";
    avatarUrl?: string;
  } | null;
}

interface ProgressStatusResponse {
  partnerPostedToday: boolean;
  partnerReactedToMineToday: boolean;
  partnerName: string;
}

function getRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "";
  }
}

export function HomeScreen() {
  const queryClient = useQueryClient();
  const storedUser = getStoredUser();

  const [isMoodSheetOpen, setIsMoodSheetOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Couple profile & startDate
  const { data: coupleData, isLoading: isLoadingCouple } = useQuery<CoupleResponse>({
    queryKey: ["couple"],
    queryFn: () => apiFetch("/couple"),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch Latest Moods
  const { data: moodsData, isLoading: isLoadingMoods } = useQuery<LatestMoodsResponse>({
    queryKey: ["moods", "latest"],
    queryFn: () => apiFetch("/moods/latest"),
  });

  // Fetch Partner Progress Status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery<ProgressStatusResponse>({
    queryKey: ["progress", "status"],
    queryFn: () => apiFetch("/progress/status"),
  });

  // Mutation to set mood
  const setMoodMutation = useMutation({
    mutationFn: (newMood: { emoji: string; energy: number; note?: string }) =>
      apiFetch<{ mood: Mood }>("/moods", {
        method: "POST",
        body: JSON.stringify(newMood),
      }),
    onMutate: async (newMood) => {
      await queryClient.cancelQueries({ queryKey: ["moods", "latest"] });
      const prev = queryClient.getQueryData<LatestMoodsResponse>(["moods", "latest"]);
      if (prev) {
        queryClient.setQueryData<LatestMoodsResponse>(["moods", "latest"], {
          ...prev,
          mine: {
            _id: "temp-" + Date.now(),
            coupleId: storedUser?.coupleId || "",
            userId: storedUser?.id || "",
            emoji: newMood.emoji,
            energy: newMood.energy,
            note: newMood.note,
            createdAt: new Date().toISOString(),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _newMood, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["moods", "latest"], context.prev);
      }
      toast.error("Failed to save vibe. Please try again.");
    },
    onSuccess: (data) => {
      queryClient.setQueryData<LatestMoodsResponse>(["moods", "latest"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mine: data.mood,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["moods", "history"] });
      toast.success("Vibe shared with " + (partnerName || "your partner") + " 💕");
    },
  });

  // Mutation to send "Thinking of you" ping
  const sendPingMutation = useMutation({
    mutationFn: () =>
      apiFetch("/notes", {
        method: "POST",
        body: JSON.stringify({
          kind: "ping",
          body: "Thinking of you 💕",
        }),
      }),
    onSuccess: () => {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 2000);
      toast.success(`Sent "Thinking of you" to ${partnerName || "your partner"}! 💌`, {
        icon: "💖",
      });
    },
    onError: () => {
      toast.error("Couldn't send ping. Check your connection.");
    },
  });

  const userName = coupleData?.user?.name || storedUser?.name || "Aman";
  const partnerName = coupleData?.partner?.name || moodsData?.partnerName || "Aditi";
  const startDateStr = coupleData?.couple?.startDate || "2025-04-16T00:00:00.000Z";

  // Calculate live time together
  const startDate = new Date(startDateStr);
  const diffSec = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  // Daily love note from config.ts
  const dailyNote = getDailyLoveNote(now);

  const mineMood = moodsData?.mine;
  const partnerMood = moodsData?.partner;

  return (
    <div className="space-y-6 pb-28">
      {/* Floating Heart Burst Animation */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1.4, y: -40 }}
            exit={{ opacity: 0, scale: 1.8, y: -80 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center text-6xl"
          >
            💖✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Greeting & Live Counter */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-[#1c1b29] via-[#16161f] to-[#121118] p-6 shadow-2xl"
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent shadow-sm">
              <Sparkles className="h-3 w-3" />
              <span>Our Space · Private Sanctuary</span>
            </span>
            <div className="flex -space-x-2">
              <div
                title={userName}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#121118] bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-xs font-bold text-[#0d0d12]"
              >
                {userName.charAt(0)}
              </div>
              <div
                title={partnerName}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#121118] bg-gradient-to-br from-[#E07A5F] to-[#E5A962] text-xs font-bold text-[#0d0d12]"
              >
                {partnerName.charAt(0)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Hello, {userName} ❤️
            </h1>
            <p className="mt-1 font-serif italic text-sm text-muted-foreground">
              "{dailyNote.note}"
            </p>
          </div>

          {/* Live "Time Together" Counter */}
          <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Time Together
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Heartbeat
              </span>
            </div>

            {isLoadingCouple ? (
              <div className="mt-2.5 h-8 w-full animate-pulse rounded-lg bg-white/5" />
            ) : (
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-accent">
                    {days}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Days
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                    {hours.toString().padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Hours
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                    {minutes.toString().padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Mins
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-accent">
                    {seconds.toString().padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Secs
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mood Section: Side-by-side cards (Mine & Partner's) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent fill-accent/20" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Today's Rhythm
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Mood Journey</span>
          </button>
        </div>

        {isLoadingMoods ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-44 rounded-3xl border border-border/40 bg-white/5 animate-pulse" />
            <div className="h-44 rounded-3xl border border-border/40 bg-white/5 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* My Mood Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => setIsMoodSheetOpen(true)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[#E5A962]/30 bg-gradient-to-b from-[#1b1a26] to-[#14131c] p-4 shadow-lg transition-all hover:border-[#E5A962]/60 hover:shadow-[#E5A962]/10 active:scale-98"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E5A962]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E5A962]">
                  You
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {mineMood ? getRelativeTime(mineMood.createdAt) : "Not set"}
                </span>
              </div>

              {mineMood ? (
                <div className="mt-3 flex flex-col items-center text-center">
                  <span className="text-4xl transition-transform group-hover:scale-110">
                    {mineMood.emoji}
                  </span>

                  {/* 5-segment energy bar */}
                  <div className="mt-2.5 flex w-full max-w-[90px] gap-1" title={`Energy: ${mineMood.energy}/5`}>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <span
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full ${
                          lvl <= mineMood.energy
                            ? "bg-[#E5A962] shadow-[0_0_6px_rgba(229,169,98,0.7)]"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-2 font-serif italic text-xs text-foreground/90 line-clamp-2 px-1">
                    {mineMood.note ? `"${mineMood.note}"` : "Vibe logged"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center text-center py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground group-hover:text-accent">
                    <SmilePlus className="h-5 w-5" />
                  </div>
                  <span className="mt-2 font-display text-xs font-semibold text-foreground">
                    Set your mood
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tap to share vibe</span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-center text-[10px] font-medium text-accent">
                <span>Update vibe</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            {/* Partner's Mood Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="relative overflow-hidden rounded-3xl border border-[#E07A5F]/30 bg-gradient-to-b from-[#1b1a26] to-[#14131c] p-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E07A5F]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E07A5F]">
                  {partnerName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {partnerMood ? getRelativeTime(partnerMood.createdAt) : "Waiting"}
                </span>
              </div>

              {partnerMood ? (
                <div className="mt-3 flex flex-col items-center text-center">
                  <span className="text-4xl animate-bounce-short">
                    {partnerMood.emoji}
                  </span>

                  {/* 5-segment energy bar */}
                  <div className="mt-2.5 flex w-full max-w-[90px] gap-1" title={`Energy: ${partnerMood.energy}/5`}>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <span
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full ${
                          lvl <= partnerMood.energy
                            ? "bg-[#E07A5F] shadow-[0_0_6px_rgba(224,122,95,0.7)]"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-2 font-serif italic text-xs text-foreground/90 line-clamp-2 px-1">
                    {partnerMood.note ? `"${partnerMood.note}"` : "Feeling radiant"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center text-center py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                    <Clock className="h-5 w-5 opacity-60" />
                  </div>
                  <span className="mt-2 font-display text-xs font-semibold text-foreground">
                    Quiet for now
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Waiting for {partnerName}'s check-in
                  </span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 mr-1 text-[#E07A5F]" />
                <span>Partner vibe</span>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* Quick-Action Row */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          {/* Action 1: "Thinking of you" ping */}
          <button
            type="button"
            disabled={sendPingMutation.isPending}
            onClick={() => sendPingMutation.mutate()}
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-[#16161f]/80 p-3 shadow-md transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95 disabled:opacity-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962]/20 to-[#E07A5F]/20 text-accent transition-transform group-hover:scale-110">
              <Heart className="h-5 w-5 fill-accent/30" />
            </div>
            <span className="mt-2 font-display text-xs font-bold text-foreground">
              {sendPingMutation.isPending ? "Sending..." : "Thinking of you"}
            </span>
            <span className="text-[10px] text-muted-foreground">Instant ping</span>
          </button>

          {/* Action 2: Open Chat */}
          <Link
            to="/app/chat"
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-[#16161f]/80 p-3 shadow-md transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962]/20 to-[#E07A5F]/20 text-accent transition-transform group-hover:scale-110">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="mt-2 font-display text-xs font-bold text-foreground">
              Open Chat
            </span>
            <span className="text-[10px] text-muted-foreground">Whispers &amp; voice</span>
          </Link>

          {/* Action 3: Post Progress */}
          <Link
            to="/app/progress"
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-[#16161f]/80 p-3 shadow-md transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962]/20 to-[#E07A5F]/20 text-accent transition-transform group-hover:scale-110">
              <Flame className="h-5 w-5 text-amber-400" />
            </div>
            <span className="mt-2 font-display text-xs font-bold text-foreground">
              Post Progress
            </span>
            <span className="text-[10px] text-muted-foreground">Share small wins</span>
          </Link>
        </div>
      </section>

      {/* Partner Daily Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="rounded-3xl border border-border/50 bg-[#16161f]/80 p-4 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-bold text-foreground">
              Daily Connection Status
            </h3>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            Today's Check-ins
          </span>
        </div>

        {isLoadingStatus ? (
          <div className="mt-3 space-y-2">
            <div className="h-8 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-8 rounded-xl bg-white/5 animate-pulse" />
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {/* Row 1: Partner progress post */}
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    statusData?.partnerPostedToday
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {statusData?.partnerPostedToday ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {partnerName} posted progress today
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {statusData?.partnerPostedToday
                      ? `${partnerName} logged milestones today!`
                      : `Still waiting for ${partnerName}'s daily update`}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  statusData?.partnerPostedToday
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {statusData?.partnerPostedToday ? "Completed ✨" : "Pending"}
              </span>
            </div>

            {/* Row 2: Partner reaction to mine */}
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    statusData?.partnerReactedToMineToday
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      statusData?.partnerReactedToMineToday ? "fill-rose-400" : ""
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {partnerName} cheered your progress
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {statusData?.partnerReactedToMineToday
                      ? `${partnerName} left sweet reactions & cheers 💕`
                      : "No cheers received yet today"}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  statusData?.partnerReactedToMineToday
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {statusData?.partnerReactedToMineToday ? "Cheered ❤️" : "Waiting"}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Daily Love Note Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-dashed border-accent/40 bg-gradient-to-br from-accent/10 via-[#181724] to-[#121118] p-5 shadow-lg text-center"
      >
        <div className="flex items-center justify-center gap-1.5 text-accent text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Love Note #{dailyNote.dayIndex} · For Today</span>
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <p className="mt-2 font-serif italic text-sm text-foreground/90 leading-relaxed px-2">
          "{dailyNote.note}"
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            to="/app/thoughts"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/30"
          >
            <span>Write back in Thoughts</span>
            <span>→</span>
          </Link>
        </div>
      </motion.div>

      {/* Set Mood Bottom Sheet / Dialog */}
      <SetMoodSheet
        open={isMoodSheetOpen}
        onOpenChange={setIsMoodSheetOpen}
        onSaveMood={async (data) => {
          await setMoodMutation.mutateAsync(data);
        }}
        initialEmoji={mineMood?.emoji || "🥰"}
        initialEnergy={mineMood?.energy || 4}
        initialNote={mineMood?.note || ""}
      />

      {/* Mood History Calendar Modal */}
      <MoodHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        partnerName={partnerName}
      />
    </div>
  );
}
