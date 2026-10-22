import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Gift,
  Lock,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Trash2,
  EyeOff,
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
import { ISurprise } from "@/types/shared";

export function SurprisePlannerScreen() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [budget, setBudget] = React.useState("");

  const { data: surprises = [], isLoading } = useQuery<ISurprise[]>({
    queryKey: ["surprises"],
    queryFn: async () => {
      const res = await apiClient.get<ISurprise[]>("/surprises");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ISurprise>("/surprises", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surprises"] });
      setCreateOpen(false);
      setTitle("");
      setNotes("");
      setTargetDate("");
      setBudget("");
      triggerHaptic("success");
      toast.success("Surprise safely stored in your private vault 🤫");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save surprise.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiClient.patch<ISurprise>(`/surprises/${id}`, { completed });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surprises"] });
      triggerHaptic("medium");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/surprises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surprises"] });
      triggerHaptic("medium");
      toast.info("Surprise removed.");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for the surprise.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      notes: notes.trim() || undefined,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      budget: budget.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Gift className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Surprise Planner
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Secret vault for gifts, getaways & surprises
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setCreateOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition-transform active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Surprise</span>
        </button>
      </div>

      {/* Secret Vault Privacy Banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-purple-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-purple-200">Strictly Private Vault: </span>
            <span className="text-purple-300/80">
              Your partner will NEVER see these items. Enforced at the database and API level.
            </span>
          </div>
        </div>
      </div>

      {/* Surprises List */}
      <div className="rounded-2xl border border-white/10 bg-[#16161f]/90 p-4 backdrop-blur-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5 text-purple-400" />
          <span>Planned Surprises</span>
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Opening vault...</div>
        ) : surprises.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No secret surprises planned yet. Start dreaming up something sweet!
          </div>
        ) : (
          <div className="space-y-2.5">
            {surprises.map((item) => (
              <div
                key={item._id}
                className={`flex items-start justify-between rounded-xl border p-3 transition-colors ${
                  item.completed
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                    : "border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({ id: item._id, completed: !item.completed })
                      }
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

                  {item.notes && (
                    <p className="text-[11px] text-muted-foreground pl-6">{item.notes}</p>
                  )}

                  <div className="flex items-center gap-3 pl-6 text-[10px] text-muted-foreground font-mono pt-0.5">
                    {item.targetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-purple-400" />
                        {new Date(item.targetDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {item.budget && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <DollarSign className="h-3 w-3" />
                        {item.budget}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(item._id)}
                  className="text-muted-foreground/60 hover:text-red-400 p-1"
                  aria-label="Delete Surprise"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Surprise Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-purple-500/30 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Add Secret Surprise 🤫
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Visible only to you. Plan dates, gifts, or travel undetected.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground">Surprise Idea</label>
              <input
                type="text"
                placeholder="e.g. Hidden rooftop picnic, custom bracelet"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Budget</label>
                <input
                  type="text"
                  placeholder="e.g. $100"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Secret Notes</label>
              <textarea
                placeholder="Codes, links, booking confirmation, hiding spot..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground focus:border-purple-400 focus:outline-none resize-none"
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
                className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {createMutation.isPending ? "Locking away..." : "Lock in Vault"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
