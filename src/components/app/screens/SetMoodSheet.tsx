import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Zap, Heart } from "lucide-react";

interface SetMoodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveMood: (data: { emoji: string; energy: number; note?: string }) => Promise<void>;
  initialEmoji?: string;
  initialEnergy?: number;
  initialNote?: string;
}

const EMOJI_OPTIONS = [
  { emoji: "🥰", label: "Loving" },
  { emoji: "✨", label: "Radiant" },
  { emoji: "💖", label: "Romantic" },
  { emoji: "😊", label: "Happy" },
  { emoji: "☕", label: "Cozy" },
  { emoji: "😌", label: "Serene" },
  { emoji: "🥱", label: "Tired" },
  { emoji: "🥺", label: "Vulnerable" },
  { emoji: "🫂", label: "Need Hugs" },
  { emoji: "🌧️", label: "Low Energy" },
  { emoji: "🤯", label: "Stressed" },
  { emoji: "😴", label: "Sleepy" },
];

const ENERGY_LABELS: Record<number, string> = {
  1: "Low Battery — Needing Rest",
  2: "Gentle Energy — Taking It Slow",
  3: "Steady & Balanced",
  4: "Bright & Motivated",
  5: "Fully Charged & Bursting with Joy!",
};

export function SetMoodSheet({
  open,
  onOpenChange,
  onSaveMood,
  initialEmoji = "🥰",
  initialEnergy = 4,
  initialNote = "",
}: SetMoodSheetProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji);
  const [energy, setEnergy] = useState(initialEnergy);
  const [note, setNote] = useState(initialNote);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSaveMood({
        emoji: selectedEmoji,
        energy,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-[#0d0d12]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                Set My Vibe
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Let your partner know how you're feeling right now
              </DialogDescription>
            </div>
          </div>

          {/* 12-Emoji Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Choose Your Emoji
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EMOJI_OPTIONS.map((item) => {
                const isSelected = selectedEmoji === item.emoji;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedEmoji(item.emoji)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 transition-all ${
                      isSelected
                        ? "border-accent bg-accent/20 shadow-md shadow-accent/20 scale-105"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="mt-1 text-[10px] font-medium text-foreground/80 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Energy Slider 1-5 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span>Energy Level (1 - 5)</span>
              </label>
              <span className="font-mono text-xs font-bold text-accent">{energy}/5</span>
            </div>

            {/* Visual 5-segment glowing energy bars */}
            <div className="flex gap-1.5 mb-2.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergy(lvl)}
                  className={`h-2.5 flex-1 rounded-full transition-all ${
                    lvl <= energy
                      ? "bg-gradient-to-r from-[#E5A962] to-[#E07A5F] shadow-sm shadow-accent/50"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-foreground/80 italic font-serif">
              "{ENERGY_LABELS[energy]}"
            </p>
          </div>

          {/* Optional Note (Up to 140 chars) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Optional Little Note
              </label>
              <span
                className={`font-mono text-[10px] ${
                  note.length > 130 ? "text-amber-400 font-bold" : "text-muted-foreground"
                }`}
              >
                {note.length}/140
              </span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="e.g. Sipping my coffee thinking of you, can't wait for dinner..."
              rows={3}
              maxLength={140}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-3 text-sm font-semibold text-[#0d0d12] shadow-lg shadow-accent/25 transition-transform active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? "Saving Vibe..." : "Share My Vibe Instantly ✨"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
