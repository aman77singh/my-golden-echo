import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Heart, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";

interface LogSymptomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDateStr?: string;
}

const COMMON_SYMPTOMS = [
  { id: "cramps", label: "Cramps", emoji: "⚡" },
  { id: "headache", label: "Headache", emoji: "🤕" },
  { id: "bloating", label: "Bloating", emoji: "🎈" },
  { id: "fatigue", label: "Fatigue", emoji: "🥱" },
  { id: "mood swings", label: "Mood Swings", emoji: "🎭" },
  { id: "cravings", label: "Cravings", emoji: "🍫" },
  { id: "acne", label: "Acne", emoji: "✨" },
  { id: "back pain", label: "Back Pain", emoji: "🩹" },
];

const MOOD_OPTIONS = [
  { emoji: "🌸", label: "Calm" },
  { emoji: "🥹", label: "Sensitive" },
  { emoji: "⚡", label: "Energetic" },
  { emoji: "🛋️", label: "Sluggish" },
  { emoji: "😠", label: "Irritable" },
  { emoji: "🥰", label: "Loving" },
];

export function LogSymptomModal({
  open,
  onOpenChange,
  selectedDateStr,
}: LogSymptomModalProps) {
  const queryClient = useQueryClient();
  const dateStr = selectedDateStr || format(new Date(), "yyyy-MM-dd");

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number>(3);
  const [selectedMood, setSelectedMood] = useState<string>("🌸 Calm");
  const [notes, setNotes] = useState("");

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const logSymptomMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/cycles/symptoms", {
        method: "POST",
        body: JSON.stringify({
          date: dateStr,
          symptoms: selectedSymptoms,
          pain,
          mood: selectedMood,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Symptoms & wellness logged! Take gentle care of yourself 🌸");
      queryClient.invalidateQueries({ queryKey: ["cycles", "symptoms"] });
      onOpenChange(false);
      setSelectedSymptoms([]);
      setPain(3);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to log symptoms.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logSymptomMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto border-rose-500/20 bg-[#14121d]/95 text-foreground backdrop-blur-2xl shadow-2xl p-6 sm:rounded-3xl">
        <DialogTitle className="flex items-center gap-2.5 font-serif text-xl font-semibold text-rose-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <span>Daily Symptoms & Feelings</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Log what your body is experiencing on {dateStr}. Tracking helps us uncover natural patterns.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Symptoms Chips */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Symptoms Experienced
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => toggleSymptom(sym.id)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-rose-400 bg-rose-400/20 text-rose-200 shadow-sm"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    <span>{sym.emoji}</span>
                    <span>{sym.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pain Level Slider (0-10) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Physical Discomfort / Pain Level
              </span>
              <span className="font-mono font-bold text-rose-300 text-sm">
                {pain} / 10
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              value={pain}
              onChange={(e) => setPain(Number(e.target.value))}
              className="w-full accent-rose-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-muted-foreground/70">
              <span>0 (None)</span>
              <span>3 (Mild)</span>
              <span>6 (Moderate)</span>
              <span>10 (Severe)</span>
            </div>
          </div>

          {/* Mood Picker */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Dominant Feeling / Mood
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MOOD_OPTIONS.map((m) => {
                const label = `${m.emoji} ${m.label}`;
                const isSelected = selectedMood === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedMood(label)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-rose-400 bg-rose-400/20 text-rose-200 font-bold shadow-sm"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logSymptomMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {logSymptomMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-current" />
                  <span>Save Symptoms</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
