import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Heart, Sparkles, Coffee, VolumeX, Flame, Film, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface BadDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName?: string;
}

const CARE_NEEDS = [
  {
    id: "snacks",
    label: "I need snacks",
    emoji: "🍫",
    desc: "Cravings for comfort treats, sweet chocolates, or warm savory bites",
  },
  {
    id: "quiet",
    label: "I need quiet",
    emoji: "🤫",
    desc: "Gentle solitude, dim lighting, no stressful questions or noise",
  },
  {
    id: "hug",
    label: "I need a hug",
    emoji: "🫂",
    desc: "Warm lingering embrace, cuddles, feeling safe in your arms",
  },
  {
    id: "distraction",
    label: "I need a distraction",
    emoji: "🎬",
    desc: "Funny memes, lighthearted show, cute animal videos, playful chats",
  },
];

export function BadDaySheet({
  open,
  onOpenChange,
  partnerName = "Aman",
}: BadDaySheetProps) {
  const queryClient = useQueryClient();
  const [selectedNeed, setSelectedNeed] = useState<string>("I need a hug");
  const [note, setNote] = useState("");

  const badDayMutation = useMutation({
    mutationFn: async () => {
      const fullMessage = note.trim()
        ? `${selectedNeed} — ${note.trim()}`
        : selectedNeed;

      return apiFetch("/notes", {
        method: "POST",
        body: JSON.stringify({
          body: fullMessage,
          kind: "badday",
        }),
      });
    },
    onSuccess: () => {
      toast.success(`Signal sent to ${partnerName}. He's got your back ❤️`);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      onOpenChange(false);
      setNote("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send status.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    badDayMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/70 bg-card/95 text-foreground backdrop-blur-2xl shadow-panel p-6 sm:rounded-3xl">
        <DialogTitle className="flex items-center gap-2.5 font-serif text-xl font-semibold text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 border border-rose-500/30">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <span>Bad Day Comfort Signal</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          You never have to pretend to be okay. Let {partnerName} know exactly what kind of comfort you need today.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              What would comfort you right now?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CARE_NEEDS.map((item) => {
                const isSelected = selectedNeed === item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedNeed(item.label)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-rose-400 bg-rose-500/15 text-rose-900 shadow-md shadow-rose-500/10"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <span className="text-2xl mb-1">{item.emoji}</span>
                    <span className="text-xs font-bold text-foreground">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Add a little note (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Feeling overwhelmed with work, feeling crampy..."
              className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-border/70 bg-background/60 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={badDayMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {badDayMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending comfort signal...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Comfort Signal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
