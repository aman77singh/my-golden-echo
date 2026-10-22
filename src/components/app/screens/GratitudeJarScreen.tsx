import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Heart,
  Plus,
  Shuffle,
  Quote,
  Calendar,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface GratitudeSlip {
  _id: string;
  body: string;
  date: string;
  userId: {
    _id: string;
    name: string;
    role: "her" | "him";
    avatarUrl?: string;
  };
  createdAt: string;
}

export function GratitudeJarScreen() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);
  const [pulledNote, setPulledNote] = React.useState<GratitudeSlip | null>(null);
  const [isPulling, setIsPulling] = React.useState(false);
  const [noteBody, setNoteBody] = React.useState("");

  const { data: slips = [], isLoading } = useQuery<GratitudeSlip[]>({
    queryKey: ["gratitudeSlips"],
    queryFn: async () => {
      const res = await apiClient.get<GratitudeSlip[]>("/gratitude");
      return res.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiClient.post<GratitudeSlip>("/gratitude", { body });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gratitudeSlips"] });
      setAddOpen(false);
      setNoteBody("");
      triggerHaptic("success");
      toast.success("Note dropped into the jar! ✨");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add note.");
    },
  });

  const handlePullRandom = async () => {
    setIsPulling(true);
    triggerHaptic("medium");

    try {
      const res = await apiClient.get<any>("/gratitude/random");
      if (res.data.empty) {
        toast.info("The jar is empty. Add your first gratitude note!");
      } else {
        triggerHaptic("success");
        setPulledNote(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to pull note.");
    } finally {
      setIsPulling(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) {
      toast.error("Please write a short note of gratitude.");
      return;
    }
    addMutation.mutate(noteBody.trim());
  };

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Gratitude Jar</h2>
            <p className="text-[11px] text-muted-foreground">
              {slips.length} sweet notes of appreciation stored
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setAddOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition-transform active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Interactive Jar Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-secondary/30 p-6 text-center shadow-panel backdrop-blur-2xl">
        <div className="mx-auto flex h-28 w-24 flex-col items-center justify-between rounded-2xl border-2 border-accent/40 bg-accent/5 p-3 shadow-inner shadow-accent/20 backdrop-blur-md relative">
          <div className="h-3 w-16 rounded-full bg-accent/30 border border-accent/40" />
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <Heart className="h-6 w-6 text-[#E07A5F] fill-current animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-accent">{slips.length} Slips</span>
          </motion.div>
          <div className="h-1.5 w-12 rounded-full bg-white/10" />
        </div>

        <p className="mt-4 text-xs font-serif italic text-muted-foreground max-w-xs mx-auto">
          "Gratitude turns what we have into enough, and more."
        </p>

        <div className="mt-5 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            disabled={isPulling || slips.length === 0}
            onClick={handlePullRandom}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#E5A962] via-[#E07A5F] to-[#E5A962] bg-[length:200%_auto] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-accent/25 transition-all hover:opacity-95 disabled:opacity-40"
          >
            <Shuffle className={`h-4 w-4 ${isPulling ? "animate-spin" : ""}`} />
            <span>{isPulling ? "Opening Jar..." : "Pull a Random Note ✨"}</span>
          </motion.button>
        </div>
      </div>

      {/* Notes Stream */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes in the Jar
        </h3>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Opening jar...</div>
        ) : slips.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No notes inside yet. Be the first to drop one in today!
          </div>
        ) : (
          <div className="space-y-2.5">
            {slips.map((slip) => (
              <motion.div
                key={slip._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/60 bg-background/50 p-3 text-xs space-y-1.5 hover:border-border/80 transition-colors"
              >
                <p className="text-foreground leading-relaxed font-serif text-sm">
                  "{slip.body}"
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                  <span className="font-semibold text-accent">
                    — {slip.userId?.name || "Partner"}
                  </span>
                  <span>
                    {new Date(slip.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Gratitude Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-border/70 bg-card/95 text-foreground backdrop-blur-2xl sm:max-w-md shadow-panel">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Drop a Gratitude Note
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              What made your heart feel warm or appreciative today?
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3 pt-2">
            <textarea
              placeholder="I loved how you held my hand while walking today..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              required
              className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {addMutation.isPending ? "Dropping in..." : "Fold & Drop In"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pulled Random Note Dialog */}
      <Dialog open={!!pulledNote} onOpenChange={(open) => !open && setPulledNote(null)}>
        <DialogContent className="border-border/70 bg-card/95 text-foreground backdrop-blur-2xl sm:max-w-md text-center p-6 shadow-panel">
          <div className="flex justify-center mb-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent animate-bounce">
              <Quote className="h-6 w-6" />
            </span>
          </div>
          <DialogTitle className="font-display text-base font-bold text-foreground">
            A Memory from the Jar ✨
          </DialogTitle>
          <div className="my-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-left">
            <p className="font-serif text-sm leading-relaxed text-foreground italic">
              "{pulledNote?.body}"
            </p>
            <div className="mt-3 text-right text-[11px] font-semibold text-accent">
              — {pulledNote?.userId?.name || "Partner"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPulledNote(null)}
            className="w-full rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2 text-xs font-semibold text-white shadow-md shadow-accent/20"
          >
            Fold it back into the jar
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
