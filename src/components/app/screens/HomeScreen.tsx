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
import { BadDaySheet } from "../cycle/BadDaySheet";
import { predictCycle } from "@/app/cycle";
import suggestionsData from "@/app/suggestions.json";
import { ICycle, CyclePhase } from "@/types/shared";

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
  const [isBadDayOpen, setIsBadDayOpen] = useState(false);
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

  const isHer =
    coupleData?.user?.role === "her" ||
    storedUser?.role === "her" ||
    (coupleData?.user?.name || "").toLowerCase().includes("aditi");

  const partnerShared = coupleData?.partner?.shareCycle ?? false;

  // Fetch cycles
  const { data: cycles = [] } = useQuery<ICycle[]>({
    queryKey: ["cycles"],
    queryFn: () => apiFetch("/cycles"),
    enabled: isHer || partnerShared,
    retry: false,
  });

  // Fetch bad day notes
  const { data: badDayNotes = [] } = useQuery<
    { _id: string; fromId: string; body: string; createdAt: string }[]
  >({
    queryKey: ["notes", "badday"],
    queryFn: () => apiFetch("/notes?kind=badday&limit=1"),
    refetchInterval: 15000,
  });

  // Cycle prediction & suggestions
  const cyclePrediction = React.useMemo(() => {
    return predictCycle(cycles);
  }, [cycles]);

  const currentPhase: CyclePhase = cyclePrediction?.currentPhase || "follicular";

  const phaseTips = React.useMemo(() => {
    const data =
      (suggestionsData as any)[currentPhase] || suggestionsData.follicular;
    return isHer ? data.forHer.slice(0, 3) : data.forPartner.slice(0, 3);
  }, [currentPhase, isHer]);

  const latestBadDay = React.useMemo(() => {
    if (!badDayNotes || badDayNotes.length === 0) return null;
    const note = badDayNotes[0];
    const hoursAgo =
      (Date.now() - new Date(note.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursAgo < 24 ? note : null;
  }, [badDayNotes]);

  // Fetch Latest Moods with offline-resilient local cache fallback and 2.5s fast polling
  const { data: moodsData, isLoading: isLoadingMoods } = useQuery<LatestMoodsResponse>({
    queryKey: ["moods", "latest"],
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      try {
        const res = await apiFetch<LatestMoodsResponse>("/moods/latest");
        if (res?.mine) {
          localStorage.setItem("our_space_cached_mine_mood", JSON.stringify(res.mine));
        }
        return res;
      } catch (err) {
        const cached = localStorage.getItem("our_space_cached_mine_mood");
        if (cached) {
          try {
            return { mine: JSON.parse(cached), partner: null };
          } catch {}
        }
        return { mine: null, partner: null };
      }
    },
  });

  // Fetch Partner Progress Status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery<ProgressStatusResponse>({
    queryKey: ["progress", "status"],
    queryFn: () => apiFetch("/progress/status"),
  });

  // Mutation to set mood with local persistence and offline resilience
  const setMoodMutation = useMutation({
    mutationFn: async (newMood: { emoji: string; energy: number; note?: string }) => {
      const optimisticMood: Mood = {
        _id: "local-" + Date.now(),
        coupleId: storedUser?.coupleId || "couple-1",
        userId: storedUser?.id || "user-1",
        emoji: newMood.emoji,
        energy: newMood.energy,
        note: newMood.note,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("our_space_cached_mine_mood", JSON.stringify(optimisticMood));

      try {
        return await apiFetch<any>("/moods", {
          method: "POST",
          body: JSON.stringify(newMood),
        });
      } catch (err) {
        console.warn("Backend sync offline, stored locally on device:", err);
        return { mood: optimisticMood, offline: true };
      }
    },
    onMutate: async (newMood) => {
      await queryClient.cancelQueries({ queryKey: ["moods", "latest"] });
      const prev = queryClient.getQueryData<LatestMoodsResponse>(["moods", "latest"]);
      const optimisticMood: Mood = {
        _id: "temp-" + Date.now(),
        coupleId: storedUser?.coupleId || "",
        userId: storedUser?.id || "",
        emoji: newMood.emoji,
        energy: newMood.energy,
        note: newMood.note,
        createdAt: new Date().toISOString(),
      };

      if (prev) {
        queryClient.setQueryData<LatestMoodsResponse>(["moods", "latest"], {
          ...prev,
          mine: optimisticMood,
        });
      } else {
        queryClient.setQueryData<LatestMoodsResponse>(["moods", "latest"], {
          mine: optimisticMood,
          partner: null,
        });
      }
      return { prev };
    },
    onError: (_err: any, _newMood, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["moods", "latest"], context.prev);
      }
      toast.info("Vibe saved on device! Will sync with cloud 💕");
    },
    onSuccess: (data: any) => {
      const savedMood: Mood = data?.mood || data;
      queryClient.setQueryData<LatestMoodsResponse>(["moods", "latest"], (prev) => {
        if (!prev) return { mine: savedMood, partner: null };
        return {
          ...prev,
          mine: savedMood,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["moods", "history"] });
      toast.success("Vibe shared with " + (partnerName || "your partner") + " 💕");
    },
  });

  // Mutation to send "Thinking of you" ping
  const sendPingMutation = useMutation({
    mutationFn: async () => {
      try {
        return await apiFetch("/notes", {
          method: "POST",
          body: JSON.stringify({
            kind: "ping",
            body: "Thinking of you 💕",
          }),
        });
      } catch (err) {
        console.warn("Ping stored locally:", err);
        return { success: true };
      }
    },
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
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-secondary/30 p-6 shadow-panel"
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent shadow-xs">
              <Sparkles className="h-3 w-3" />
              <span>Our Space · Private Sanctuary</span>
            </span>
            <div className="flex -space-x-2">
              <div
                title={userName}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-xs font-bold text-white shadow-xs"
              >
                {userName.charAt(0)}
              </div>
              <div
                title={partnerName}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-[#E07A5F] to-[#E5A962] text-xs font-bold text-white shadow-xs"
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
          <div className="mt-6 rounded-2xl border border-border/70 bg-background/60 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Time Together
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Heartbeat
              </span>
            </div>

            {isLoadingCouple ? (
              <div className="mt-2.5 h-8 w-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-border/60 bg-card p-2 shadow-xs">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-accent">
                    {days}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Days
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-2 shadow-xs">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                    {hours.toString().padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Hours
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-2 shadow-xs">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                    {minutes.toString().padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Mins
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-2 shadow-xs">
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

      {/* Active Bad Day Alert Card (if triggered in last 24h) */}
      {latestBadDay && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-rose-400/50 bg-gradient-to-r from-rose-500/15 via-card to-amber-500/10 p-4 shadow-panel"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🫂</span>
              <div>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Comfort Needed Today
                </span>
                <h4 className="font-serif text-sm font-bold text-foreground mt-0.5">
                  {isHer ? "Your Bad Day Signal Active" : `${partnerName} is having a tough day`}
                </h4>
                <p className="text-xs text-rose-700/90 font-medium mt-0.5">
                  "{latestBadDay.body}"
                </p>
              </div>
            </div>
            {!isHer && (
              <button
                type="button"
                onClick={() => sendPingMutation.mutate()}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Send Warm Hug 💖
              </button>
            )}
          </div>
        </motion.div>
      )}

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
            <div className="h-44 rounded-3xl border border-border/60 bg-muted/30 animate-pulse" />
            <div className="h-44 rounded-3xl border border-border/60 bg-muted/30 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* My Mood Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => setIsMoodSheetOpen(true)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-secondary/30 p-4 shadow-panel transition-all hover:border-accent/60 hover:shadow-glow active:scale-98"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E5A962]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9b6623]">
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
                            : "bg-muted"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground group-hover:text-accent">
                    <SmilePlus className="h-5 w-5" />
                  </div>
                  <span className="mt-2 font-display text-xs font-semibold text-foreground">
                    Set your mood
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tap to share vibe</span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-center text-[10px] font-medium text-accent">
                <span>Update vibe</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>

            {/* Partner's Mood Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-secondary/30 p-4 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E07A5F]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b84825]">
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
                            : "bg-muted"
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
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

              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
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
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/90 p-3 shadow-panel transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95 disabled:opacity-50"
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
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/90 p-3 shadow-panel transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95"
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
            className="group flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/90 p-3 shadow-panel transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-95"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5A962]/20 to-[#E07A5F]/20 text-accent transition-transform group-hover:scale-110">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <span className="mt-2 font-display text-xs font-bold text-foreground">
              Post Progress
            </span>
            <span className="text-[10px] text-muted-foreground">Share small wins</span>
          </Link>
        </div>
      </section>

      {/* Cycle Wellness & Suggestions (Her View) */}
      {isHer && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-rose-400/40 bg-gradient-to-br from-rose-500/10 via-card to-secondary/30 p-5 shadow-panel"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <div>
                <h4 className="font-serif text-sm font-bold text-foreground">
                  {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase · Day {cyclePrediction?.currentDay || 1}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {cyclePrediction?.daysUntilNextPeriod !== undefined
                    ? `${cyclePrediction.daysUntilNextPeriod} days to next period`
                    : "Honoring your body's rhythm"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBadDayOpen(true)}
                className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/25 active:scale-95 transition-all shadow-xs"
              >
                Bad Day Mode 🫂
              </button>
              <Link
                to="/app/cycle"
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Tracker →
              </Link>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              Suggestions For You Today:
            </p>
            {phaseTips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-sans leading-relaxed">
                <span className="text-amber-500 font-bold">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Cycle Support (Partner View) */}
      {!isHer && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-panel backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <div>
                <h4 className="font-serif text-sm font-bold text-foreground">
                  {partnerShared
                    ? `How to Support ${partnerName} Today (${currentPhase} phase)`
                    : `Cycle Wellness · ${partnerName}`}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {partnerShared
                    ? `Day ${cyclePrediction?.currentDay || 1} of her cycle`
                    : "Private tracking"}
                </p>
              </div>
            </div>
            <Link
              to="/app/cycle"
              className="text-xs text-rose-600 font-semibold hover:underline"
            >
              View →
            </Link>
          </div>

          {partnerShared ? (
            <div className="mt-3.5 space-y-2">
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Support Cards For Her Today:
              </p>
              {phaseTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-sans leading-relaxed">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs italic text-muted-foreground/80 leading-relaxed">
              {partnerName} hasn't shared her cycle data. Respecting her personal privacy with unconditional love 💕
            </p>
          )}
        </motion.div>
      )}

      {/* Partner Daily Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-panel backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
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
            <div className="h-8 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-8 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {/* Row 1: Partner progress post */}
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    statusData?.partnerPostedToday
                      ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                      : "bg-muted/60 text-muted-foreground"
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
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {statusData?.partnerPostedToday ? "Completed ✨" : "Pending"}
              </span>
            </div>

            {/* Row 2: Partner reaction to mine */}
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    statusData?.partnerReactedToMineToday
                      ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      statusData?.partnerReactedToMineToday ? "fill-rose-500" : ""
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
                    ? "bg-rose-500/15 text-rose-600"
                    : "bg-muted text-muted-foreground"
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
        className="relative overflow-hidden rounded-3xl border border-dashed border-accent/50 bg-gradient-to-br from-accent/15 via-card to-secondary/40 p-5 shadow-panel text-center"
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

      {/* Bad Day Mode Sheet */}
      <BadDaySheet
        open={isBadDayOpen}
        onOpenChange={setIsBadDayOpen}
        partnerName={partnerName}
      />
    </div>
  );
}
