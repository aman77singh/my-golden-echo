import { motion } from "motion/react";
import { Sparkles, Calendar, Lock, Heart, ShieldCheck, Plus, AlertCircle } from "lucide-react";

export function CycleScreen() {
  const currentPhase = {
    name: "Luteal Phase",
    day: 21,
    cycleLength: 28,
    status: "Normal",
    vibe: "Craving warm soups, soft cuddles & movie nights",
    careTip: "Offer back rubs and keep chocolate handy!",
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header with Privacy Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Cycle &amp; Wellness
          </h2>
          <p className="text-xs text-muted-foreground">Understanding her rhythms with gentle care</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Shared with Love</span>
        </div>
      </div>

      {/* Main Cycle Wheel / Visual Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-b from-[#24171d] via-[#1b1419] to-[#141014] p-6 shadow-2xl text-center"
      >
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-0.5 text-xs font-semibold text-rose-300">
            Day {currentPhase.day} of {currentPhase.cycleLength}
          </span>

          <div className="my-5 relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-rose-500/20 bg-rose-500/5 shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-3xl">🌸</span>
              <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                {currentPhase.name}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-rose-300 font-semibold">
                Gentle Pace
              </span>
            </div>
          </div>

          <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
            "{currentPhase.vibe}"
          </p>

          <div className="mt-5 w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <Heart className="h-3.5 w-3.5 fill-current" />
              <span>Partner Tip</span>
            </div>
            <p className="mt-1 text-xs text-rose-100/90 leading-relaxed font-sans">
              {currentPhase.careTip}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Log Symptoms Quick Row */}
      <div className="rounded-3xl border border-white/5 bg-[#16161f]/80 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold text-foreground">Today's Symptoms</h4>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Symptoms</span>
          </button>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {["Light cramps", "Tiredness", "Craving sweets", "Back warmth"].map((sym) => (
            <span
              key={sym}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground/80 font-medium"
            >
              {sym}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
