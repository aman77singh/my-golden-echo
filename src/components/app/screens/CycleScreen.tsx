import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Calendar as CalendarIcon,
  Lock,
  Heart,
  ShieldCheck,
  Plus,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Droplet,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  LockOpen,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { toast } from "sonner";

import { apiFetch, getStoredUser } from "@/lib/api";
import { ICycle, ISymptomLog, CyclePhase, CycleFlow } from "@/types/shared";
import {
  predictCycle,
  generateCycleInsights,
  parseDateOnly,
  ESTIMATES_DISCLAIMER,
} from "@/app/cycle";
import suggestionsData from "@/app/suggestions.json";
import { DoctorReportModal } from "../cycle/DoctorReportModal";
import { LogSymptomModal } from "../cycle/LogSymptomModal";
import { BadDaySheet } from "../cycle/BadDaySheet";

interface CoupleResponse {
  couple: {
    _id: string;
    startDate: string;
  };
  user: {
    _id: string;
    name: string;
    email: string;
    role: "her" | "him";
    shareCycle: boolean;
    avatarUrl?: string;
  };
  partner: {
    _id: string;
    name: string;
    role: "her" | "him";
    shareCycle: boolean;
    avatarUrl?: string;
  } | null;
}

const FLOW_LEVELS: { id: CycleFlow; label: string; icon: string }[] = [
  { id: "light", label: "Light", icon: "💧" },
  { id: "medium", label: "Medium", icon: "🩸" },
  { id: "heavy", label: "Heavy", icon: "🌊" },
  { id: "spotting", label: "Spotting", icon: "✨" },
];

export function CycleScreen() {
  const queryClient = useQueryClient();
  const storedUser = getStoredUser();

  // Modals state
  const [logSymptomOpen, setLogSymptomOpen] = useState(false);
  const [doctorReportOpen, setDoctorReportOpen] = useState(false);
  const [badDayOpen, setBadDayOpen] = useState(false);

  // Calendar month state & selected date
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());

  // Selected flow for logging
  const [selectedFlow, setSelectedFlow] = useState<CycleFlow>("medium");
  const [isLoggingFlow, setIsLoggingFlow] = useState(false);

  // Queries
  const { data: coupleData } = useQuery<CoupleResponse>({
    queryKey: ["couple"],
    queryFn: () => apiFetch("/couple"),
    staleTime: 1000 * 60 * 5,
  });

  const isHer =
    coupleData?.user?.role === "her" ||
    storedUser?.role === "her" ||
    (coupleData?.user?.name || "").toLowerCase().includes("aditi");

  const isPartner = !isHer;

  // Partner shareCycle check:
  // If currentUser is 'him', check coupleData.partner?.shareCycle
  const partnerShared =
    coupleData?.partner?.shareCycle ?? false;

  const myShareCycle = coupleData?.user?.shareCycle ?? false;

  // Fetch cycles
  const {
    data: cycles = [],
    isLoading: isLoadingCycles,
    error: cyclesError,
  } = useQuery<ICycle[]>({
    queryKey: ["cycles"],
    queryFn: () => apiFetch("/cycles"),
    enabled: isHer || partnerShared,
    retry: false,
  });

  // Fetch symptom logs
  const { data: symptomLogs = [] } = useQuery<ISymptomLog[]>({
    queryKey: ["cycles", "symptoms"],
    queryFn: () => apiFetch("/cycles/symptoms"),
    enabled: isHer || partnerShared,
  });

  // Mutations
  const toggleShareCycleMutation = useMutation({
    mutationFn: async (shareCycle: boolean) => {
      return apiFetch("/me/privacy", {
        method: "PATCH",
        body: JSON.stringify({ shareCycle }),
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.user.shareCycle
          ? "Cycle shared with your partner 💕"
          : "Cycle data is now private to you 🔒"
      );
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update sharing preference.");
    },
  });

  const logPeriodStartMutation = useMutation({
    mutationFn: async (flow: CycleFlow) => {
      return apiFetch("/cycles", {
        method: "POST",
        body: JSON.stringify({
          startDate: format(new Date(), "yyyy-MM-dd"),
          flow,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Period start logged. Sending warm comfort your way 🌸");
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      setIsLoggingFlow(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to log period start.");
    },
  });

  const logPeriodEndMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      return apiFetch(`/cycles/${cycleId}`, {
        method: "PUT",
        body: JSON.stringify({
          endDate: format(new Date(), "yyyy-MM-dd"),
        }),
      });
    },
    onSuccess: () => {
      toast.success("Period end logged ✨ Cycle transition noted.");
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to log period end.");
    },
  });

  // Prediction calculations
  const prediction = useMemo(() => {
    return predictCycle(cycles);
  }, [cycles]);

  // Insights calculations
  const insights = useMemo(() => {
    return generateCycleInsights(cycles, symptomLogs);
  }, [cycles, symptomLogs]);

  // Latest cycle
  const latestCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return null;
    return [...cycles].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )[0];
  }, [cycles]);

  const isPeriodCurrentlyActive = useMemo(() => {
    if (!latestCycle) return false;
    return !latestCycle.endDate;
  }, [latestCycle]);

  // Calendar dates
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart);

  // Map of date string -> symptom log
  const symptomsByDate = useMemo(() => {
    const map = new Map<string, ISymptomLog>();
    for (const log of symptomLogs) {
      map.set(log.date, log);
    }
    return map;
  }, [symptomLogs]);

  const selectedDateLog = useMemo(() => {
    const key = format(selectedCalendarDate, "yyyy-MM-dd");
    return symptomsByDate.get(key) || null;
  }, [selectedCalendarDate, symptomsByDate]);

  // Phase color theme and icons
  const phaseInfo = useMemo(() => {
    const phase: CyclePhase = prediction?.currentPhase || "follicular";
    switch (phase) {
      case "menstrual":
        return {
          title: "Menstrual Phase",
          emoji: "🌸",
          accentColor: "from-rose-500/15 via-card to-rose-500/5",
          textColor: "text-rose-600",
          borderColor: "border-rose-400/40",
          badgeBg: "bg-rose-500/15 border-rose-400/30 text-rose-600",
          vibe: "Restorative nesting, quiet comfort, warm broths & snuggles",
        };
      case "follicular":
        return {
          title: "Follicular Phase",
          emoji: "🌱",
          accentColor: "from-emerald-500/15 via-card to-teal-500/5",
          textColor: "text-emerald-700",
          borderColor: "border-emerald-500/40",
          badgeBg: "bg-emerald-500/15 border-emerald-400/30 text-emerald-700",
          vibe: "Rising vitality, creative clarity, adventurous energy & fresh starts",
        };
      case "ovulatory":
        return {
          title: "Ovulatory Phase",
          emoji: "✨",
          accentColor: "from-amber-500/15 via-card to-orange-500/5",
          textColor: "text-amber-700",
          borderColor: "border-amber-500/40",
          badgeBg: "bg-amber-500/15 border-amber-400/30 text-amber-700",
          vibe: "Peak radiance, confidence, social magnetism & deep romance",
        };
      case "luteal":
      default:
        return {
          title: "Luteal Phase",
          emoji: "🌙",
          accentColor: "from-purple-500/15 via-card to-pink-500/5",
          textColor: "text-purple-700",
          borderColor: "border-purple-400/40",
          badgeBg: "bg-purple-500/15 border-purple-400/30 text-purple-700",
          vibe: "Gentle inward reflection, cozy movie nights, sweet comfort treats",
        };
    }
  }, [prediction]);

  // Phase suggestions from suggestions.json
  const currentSuggestions = useMemo(() => {
    const phase = prediction?.currentPhase || "follicular";
    const phaseKey = phase as keyof typeof suggestionsData;
    const data = suggestionsData[phaseKey] || suggestionsData.follicular;

    if (isHer) {
      return data.forHer;
    } else {
      return data.forPartner;
    }
  }, [prediction, isHer]);

  // Partner Unshared Privacy State (if partner hasn't shared)
  if (isPartner && !partnerShared) {
    return (
      <div className="space-y-5 pb-32">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Cycle & Wellness
            </h2>
            <p className="text-xs text-muted-foreground">
              Understanding her natural rhythms with care
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Private</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-8 text-center shadow-panel"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/15 text-rose-600 border border-rose-500/30 shadow-lg shadow-rose-500/10">
            <Heart className="h-8 w-8 fill-current" />
          </div>

          <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
            {coupleData?.partner?.name || "She"} hasn't shared her cycle yet
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Her personal cycle and health data are private until she decides to share them with you. In the meantime, you can always send her loving thoughts and warm comfort!
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                toast.success("Thinking of you sent to her! ❤️");
                apiFetch("/notes", {
                  method: "POST",
                  body: JSON.stringify({
                    body: "Thinking of you my sweet love ❤️",
                    kind: "ping",
                  }),
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Heart className="h-4 w-4 fill-current" />
              <span>Send Loving Ping</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Modals */}
      <LogSymptomModal
        open={logSymptomOpen}
        onOpenChange={setLogSymptomOpen}
        selectedDateStr={format(selectedCalendarDate, "yyyy-MM-dd")}
      />

      <DoctorReportModal
        open={doctorReportOpen}
        onOpenChange={setDoctorReportOpen}
        cycles={cycles}
        symptomLogs={symptomLogs}
        userName={coupleData?.user?.name}
      />

      <BadDaySheet
        open={badDayOpen}
        onOpenChange={setBadDayOpen}
        partnerName={coupleData?.partner?.name || "Partner"}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Cycle & Wellness
          </h2>
          <p className="text-xs text-muted-foreground">
            {isHer
              ? "Honoring your body's natural wisdom and phases"
              : `Supporting ${coupleData?.partner?.name || "her"} with empathy and tenderness`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* PDF Doctor Report button */}
          <button
            type="button"
            onClick={() => setDoctorReportOpen(true)}
            title="Export Doctor Visit PDF"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground active:scale-95 transition-all shadow-xs"
          >
            <FileText className="h-4 w-4 text-rose-600" />
          </button>

          {/* If Her: Sharing Privacy Toggle */}
          {isHer && (
            <button
              type="button"
              onClick={() =>
                toggleShareCycleMutation.mutate(!myShareCycle)
              }
              title={myShareCycle ? "Shared with partner" : "Private"}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                myShareCycle
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-sm"
                  : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
              }`}
            >
              {myShareCycle ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Shared</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Private</span>
                </>
              )}
            </button>
          )}

          {isPartner && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              <span>Partner View</span>
            </div>
          )}
        </div>
      </div>

      {/* Bad Day Mode Trigger (Available for Her) */}
      {isHer && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-amber-500/10 p-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🫂</span>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                Tough day or overwhelmed?
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Signal snacks, quiet, a hug, or distraction to {coupleData?.partner?.name || "Aman"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBadDayOpen(true)}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            Bad Day Mode
          </button>
        </motion.div>
      )}

      {/* Main Cycle Wheel / Visual Phase Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-3xl border ${phaseInfo.borderColor} bg-gradient-to-b ${phaseInfo.accentColor} p-6 shadow-2xl text-center`}
      >
        <div className="relative z-10 flex flex-col items-center">
          {/* Day of Cycle & Current Phase */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${phaseInfo.badgeBg}`}
            >
              Day {prediction?.currentDay || 1} of ~
              {prediction?.avgCycleLength || 28}
            </span>
            {isPeriodCurrentlyActive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-200 animate-pulse">
                <Droplet className="h-3 w-3 fill-current" />
                Period Active
              </span>
            )}
          </div>

          {/* Circular Phase Centerpiece */}
          <div className="my-5 relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-border/70 bg-background/50 shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-4xl">{phaseInfo.emoji}</span>
              <h3 className="mt-1 font-serif text-lg font-bold text-foreground">
                {phaseInfo.title}
              </h3>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${phaseInfo.textColor}`}>
                {prediction?.daysUntilNextPeriod !== undefined
                  ? `${prediction.daysUntilNextPeriod} days to next`
                  : "Tracking rhythm"}
              </span>
            </div>
          </div>

          <p className="max-w-xs text-xs italic text-muted-foreground leading-relaxed">
            "{phaseInfo.vibe}"
          </p>

          {/* Predictions Summary Pill */}
          {prediction && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground/90">
              <span className="rounded-xl border border-border/70 bg-background/60 px-2.5 py-1">
                📅 Next Period: {format(prediction.expectedNextStart, "MMM d")} (±
                {prediction.stdDev}d)
              </span>
              <span className="rounded-xl border border-border/70 bg-background/60 px-2.5 py-1">
                🌸 Ovulation ~ {format(prediction.ovulationDate, "MMM d")}
              </span>
            </div>
          )}

          {/* Mandatory Disclaimer */}
          <p className="mt-3 text-[10px] text-muted-foreground/60 max-w-xs">
            {ESTIMATES_DISCLAIMER}
          </p>
        </div>
      </motion.div>

      {/* Period Logging Quick Actions (For Her) */}
      {isHer && (
        <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-panel">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
              <Droplet className="h-4 w-4 text-rose-400" />
              <span>Period & Flow Logging</span>
            </h4>
            <button
              type="button"
              onClick={() => setLogSymptomOpen(true)}
              className="text-xs font-semibold text-rose-300 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Symptoms</span>
            </button>
          </div>

          {isPeriodCurrentlyActive ? (
            <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
              <div>
                <p className="text-xs font-bold text-rose-200">
                  Period is logged as active
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Started on{" "}
                  {latestCycle
                    ? format(parseDateOnly(latestCycle.startDate), "MMM d, yyyy")
                    : "recently"}
                </p>
              </div>
              <button
                type="button"
                disabled={logPeriodEndMutation.isPending}
                onClick={() =>
                  latestCycle && logPeriodEndMutation.mutate(latestCycle._id)
                }
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
              >
                {logPeriodEndMutation.isPending ? "Saving..." : "Log Period End"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Did your period start today?
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoggingFlow(!isLoggingFlow)}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md active:scale-95"
                >
                  Log Period Start
                </button>
              </div>

              {isLoggingFlow && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-2.5"
                >
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Today's Flow
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FLOW_LEVELS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFlow(f.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border py-2 text-xs transition-all ${
                          selectedFlow === f.id
                            ? "border-rose-400 bg-rose-400/20 font-bold text-rose-700 shadow-sm"
                            : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
                        }`}
                      >
                        <span className="text-base">{f.icon}</span>
                        <span className="text-[10px] mt-0.5">{f.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLoggingFlow(false)}
                      className="rounded-xl border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground hover:bg-card"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={logPeriodStartMutation.isPending}
                      onClick={() =>
                        logPeriodStartMutation.mutate(selectedFlow)
                      }
                      className="rounded-xl bg-rose-500 px-4 py-1 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {logPeriodStartMutation.isPending
                        ? "Confirming..."
                        : "Confirm Start"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Calendar with Period, Prediction, Fertile, & Ovulation Days */}
      <div className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-rose-400" />
            <h4 className="font-serif text-sm font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground/80">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Period
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-dashed border-rose-400" /> Predicted
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400" /> Fertile Window
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Ovulation
          </span>
        </div>

        {/* Calendar Grid */}
        <div className="mt-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-10" />
            ))}

            {daysInMonth.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isSelected = isSameDay(day, selectedCalendarDate);
              const isToday = isSameDay(day, new Date());
              const hasSymptomLog = symptomsByDate.has(dayStr);

              // Check if date falls in recorded period
              const isPeriodDay = cycles.some((c) => {
                const s = parseDateOnly(c.startDate);
                const e = c.endDate ? parseDateOnly(c.endDate) : new Date();
                return isWithinInterval(day, { start: s, end: e });
              });

              // Check if date is in predicted next period range
              const isPredictedDay =
                prediction &&
                isWithinInterval(day, {
                  start: prediction.earliestNextStart,
                  end: prediction.latestNextStart,
                });

              // Check if fertile window
              const isFertileDay =
                prediction &&
                isWithinInterval(day, {
                  start: prediction.fertileWindowStart,
                  end: prediction.fertileWindowEnd,
                });

              // Check if ovulation day
              const isOvulationDay =
                prediction && isSameDay(day, prediction.ovulationDate);

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedCalendarDate(day)}
                  className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-xs transition-all ${
                    isSelected
                      ? "ring-2 ring-white font-bold"
                      : ""
                  } ${
                    isPeriodDay
                      ? "bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-sm"
                      : isOvulationDay
                      ? "bg-amber-400/25 text-amber-200 border border-amber-400/50 shadow-sm"
                      : isFertileDay
                      ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                      : isPredictedDay
                      ? "border border-dashed border-rose-400/60 bg-rose-500/10 text-rose-300"
                      : isToday
                      ? "border border-white/20 bg-white/10 text-foreground"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {hasSymptomLog && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              {format(selectedCalendarDate, "EEEE, MMMM d, yyyy")}
            </span>
            {isHer && (
              <button
                type="button"
                onClick={() => setLogSymptomOpen(true)}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                + Log symptoms for this day
              </button>
            )}
          </div>

          {selectedDateLog ? (
            <div className="mt-2.5 rounded-2xl border border-border/70 bg-background/50 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-600">
                  Mood: {selectedDateLog.mood || "Not specified"}
                </span>
                {selectedDateLog.pain !== undefined && (
                  <span className="text-[11px] text-muted-foreground">
                    Pain level: {selectedDateLog.pain}/10
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDateLog.symptoms.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-border/70 bg-card/80 px-2 py-0.5 text-[10px] text-foreground/80"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground/60">
              No symptoms logged for this date.
            </p>
          )}
        </div>
      </div>

      {/* Phase Suggestions Cards (from suggestions.json) */}
      <div className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-panel">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h4 className="font-serif text-sm font-bold text-foreground">
            {isHer
              ? `Gentle Suggestions for ${phaseInfo.title}`
              : `How to Support ${coupleData?.partner?.name || "Her"} Today`}
          </h4>
        </div>

        <div className="space-y-2">
          {currentSuggestions.slice(0, 6).map((tip, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-foreground/90 leading-relaxed font-sans"
            >
              <span className="text-amber-400 font-bold">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Symptom Insights after 3+ Cycles */}
      {insights.length > 0 && (
        <div className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-panel">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-rose-400" />
            <h4 className="font-serif text-sm font-bold text-foreground">
              Cycle Patterns & Insights
            </h4>
          </div>

          <div className="space-y-2.5">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-rose-300">
                    {insight.title}
                  </h5>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {insight.confidence}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed font-sans">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
