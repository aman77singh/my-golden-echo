import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Target, Sparkles, Calendar, BookOpen, Dumbbell, Briefcase, Award, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface NewGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { name: "Study", icon: BookOpen, color: "from-amber-500/20 to-yellow-500/10 text-amber-300" },
  { name: "Fitness", icon: Dumbbell, color: "from-emerald-500/20 to-teal-500/10 text-emerald-300" },
  { name: "Work", icon: Briefcase, color: "from-blue-500/20 to-indigo-500/10 text-blue-300" },
  { name: "Skill", icon: Award, color: "from-purple-500/20 to-pink-500/10 text-purple-300" },
  { name: "Personal", icon: Heart, color: "from-rose-500/20 to-orange-500/10 text-rose-300" },
];

export function NewGoalModal({ open, onOpenChange }: NewGoalModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Study");
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState("chapters");
  const [deadline, setDeadline] = useState("");

  const createGoalMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      category: string;
      targetCount: number;
      unit: string;
      deadline?: string;
    }) => {
      return apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success("New goal created! Let's conquer it together ✨");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onOpenChange(false);
      setTitle("");
      setTargetCount(10);
      setUnit("chapters");
      setDeadline("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create goal.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a goal title.");
      return;
    }
    if (targetCount <= 0) {
      toast.error("Target count must be greater than 0.");
      return;
    }

    createGoalMutation.mutate({
      title: title.trim(),
      category,
      targetCount,
      unit: unit.trim() || "units",
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/70 bg-card/95 text-foreground backdrop-blur-2xl shadow-panel p-6 sm:rounded-3xl">
        <DialogTitle className="flex items-center gap-2.5 font-serif text-xl font-semibold text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/30">
            <Target className="h-5 w-5" />
          </div>
          <span>Set a New Shared Milestone</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Define a meaningful target. Each progress post will automatically step you closer to victory!
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Goal Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish Organic Chemistry, Run 50km"
              className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Category
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-accent bg-accent/20 text-accent font-bold shadow-sm"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Count & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Target Count
              </label>
              <input
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="chapters, km, hours, pages"
                className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Deadline */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-accent" />
              Target Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          {/* Submit Buttons */}
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
              disabled={createGoalMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {createGoalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-current" />
                  <span>Create Goal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
