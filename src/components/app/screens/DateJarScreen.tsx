import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Utensils,
  Compass,
  Home,
  Sun,
  Coffee,
  Shuffle,
  Plus,
  CheckCircle2,
  Trash2,
  DollarSign,
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
import { IDateIdea } from "@/types/shared";

export function DateJarScreen() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [pulledIdea, setPulledIdea] = React.useState<IDateIdea | null>(null);
  const [isPulling, setIsPulling] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<IDateIdea["category"]>("chill");
  const [vibe, setVibe] = React.useState("");
  const [cost, setCost] = React.useState<IDateIdea["estimatedCost"]>("$");

  const { data: ideas = [], isLoading } = useQuery<IDateIdea[]>({
    queryKey: ["dateIdeas"],
    queryFn: async () => {
      const res = await apiClient.get<IDateIdea[]>("/dates");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<IDateIdea>("/dates", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
      setCreateOpen(false);
      setTitle("");
      setVibe("");
      triggerHaptic("success");
      toast.success("Date idea dropped into the jar! 🍷");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add date idea.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<IDateIdea>(`/dates/${id}/complete`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
      triggerHaptic("medium");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
      triggerHaptic("medium");
      toast.info("Date idea removed.");
    },
  });

  const handlePullRandom = async () => {
    setIsPulling(true);
    triggerHaptic("medium");

    try {
      const res = await apiClient.get<any>("/dates/random");
      if (res.data.empty) {
        toast.info("Your Date Jar is empty! Add a few fun ideas together.");
      } else {
        triggerHaptic("success");
        setPulledIdea(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to pick date.");
    } finally {
      setIsPulling(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a date idea.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      category,
      vibe: vibe.trim() || undefined,
      estimatedCost: cost,
    });
  };

  const categories = [
    { id: "all", label: "All Ideas" },
    { id: "chill", label: "Chill", icon: Coffee },
    { id: "food", label: "Food", icon: Utensils },
    { id: "outdoor", label: "Outdoor", icon: Sun },
    { id: "indoor", label: "Indoor", icon: Home },
    { id: "adventure", label: "Adventure", icon: Compass },
  ];

  const filtered = ideas.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory
  );

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Date Jar</h2>
            <p className="text-[11px] text-muted-foreground">
              {ideas.length} romantic & fun adventures waiting
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setCreateOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-3 py-1.5 text-xs font-semibold text-[#0d0d12] shadow-sm shadow-accent/20 transition-transform active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Idea</span>
        </button>
      </div>

      {/* Hero Jar Card */}
      <div className="rounded-3xl border border-accent/25 bg-gradient-to-b from-[#E5A962]/15 via-[#181622] to-[#121118] p-6 text-center shadow-xl backdrop-blur-2xl">
        <h3 className="font-display text-sm font-bold text-foreground">
          What should we do tonight? 🍷
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Take the decision fatigue away — pick a date at random!
        </p>

        <div className="mt-4 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            disabled={isPulling || ideas.length === 0}
            onClick={handlePullRandom}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#E5A962] via-[#E07A5F] to-[#E5A962] px-5 py-2.5 text-xs font-bold text-[#0d0d12] shadow-lg shadow-accent/25 transition-all hover:opacity-95 disabled:opacity-40"
          >
            <Shuffle className={`h-4 w-4 ${isPulling ? "animate-spin" : ""}`} />
            <span>{isPulling ? "Picking an idea..." : "Pick a Random Date! 🎲"}</span>
          </motion.button>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => {
          const isSelected = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setSelectedCategory(c.id);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? "bg-accent text-[#0d0d12] font-semibold"
                  : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Ideas List */}
      <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Date Ideas ({filtered.length})
        </h3>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Opening jar...</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No date ideas in this category yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <div
                key={item._id}
                className={`flex items-start justify-between rounded-xl border p-3 transition-colors ${
                  item.completed
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                    : "border-white/5 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(item._id)}
                      className="text-muted-foreground hover:text-emerald-400"
                    >
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          item.completed ? "text-emerald-400 fill-emerald-500/20" : "text-white/20"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs font-semibold ${
                        item.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pl-6 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 uppercase font-medium">
                      {item.category}
                    </span>
                    {item.vibe && <span>• {item.vibe}</span>}
                    <span className="text-emerald-400 font-mono">• {item.estimatedCost}</span>
                    {item.pulledCount > 0 && <span>• Picked {item.pulledCount}x</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(item._id)}
                  className="text-muted-foreground/60 hover:text-red-400 p-1"
                  aria-label="Delete Date Idea"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Date Idea Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Add Date Idea
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Drop an adventure or cozy night idea into the jar!
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground">Idea</label>
              <input
                type="text"
                placeholder="e.g. Midnight dessert run, candlelit painting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="chill" className="bg-[#16161f]">Chill</option>
                  <option value="food" className="bg-[#16161f]">Food & Dining</option>
                  <option value="outdoor" className="bg-[#16161f]">Outdoor</option>
                  <option value="indoor" className="bg-[#16161f]">Indoor</option>
                  <option value="adventure" className="bg-[#16161f]">Adventure</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Cost</label>
                <select
                  value={cost}
                  onChange={(e) => setCost(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="free" className="bg-[#16161f]">Free</option>
                  <option value="$" className="bg-[#16161f]">$ (Inexpensive)</option>
                  <option value="$$" className="bg-[#16161f]">$$ (Moderate)</option>
                  <option value="$$$" className="bg-[#16161f]">$$$ (Special)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Vibe (Optional)</label>
              <input
                type="text"
                placeholder="e.g. cozy & quiet, spontaneous"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-1.5 text-xs font-semibold text-[#0d0d12] shadow-sm shadow-accent/20 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {createMutation.isPending ? "Dropping in..." : "Drop in Jar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Random Pick Reveal Modal */}
      <Dialog open={!!pulledIdea} onOpenChange={(open) => !open && setPulledIdea(null)}>
        <DialogContent className="border-accent/40 bg-gradient-to-b from-[#1c1926] to-[#121118] text-foreground backdrop-blur-2xl sm:max-w-md text-center p-6">
          <div className="flex justify-center mb-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent animate-bounce">
              <Sparkles className="h-6 w-6" />
            </span>
          </div>
          <DialogTitle className="font-display text-base font-bold text-foreground">
            Tonight's Selected Date! ✨
          </DialogTitle>
          <div className="my-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-center space-y-2">
            <h4 className="font-display text-base font-bold text-foreground">
              {pulledIdea?.title}
            </h4>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                {pulledIdea?.category}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">{pulledIdea?.estimatedCost}</span>
              {pulledIdea?.vibe && (
                <>
                  <span>•</span>
                  <span>{pulledIdea.vibe}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPulledIdea(null)}
            className="w-full rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-2 text-xs font-semibold text-[#0d0d12] shadow-md shadow-accent/20"
          >
            Let's do this! 🍷
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
