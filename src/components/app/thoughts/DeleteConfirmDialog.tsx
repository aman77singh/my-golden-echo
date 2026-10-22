import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { IThought } from "@/types/shared";

interface DeleteConfirmDialogProps {
  thought: IThought | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConfirmDialog({
  thought,
  open,
  onOpenChange,
}: DeleteConfirmDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!thought) return;
      return apiFetch(`/thoughts/${thought._id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Entry deleted.");
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete entry.");
    },
  });

  if (!thought) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-rose-500/30 bg-[#16121d]/95 text-foreground backdrop-blur-2xl shadow-2xl p-6 sm:rounded-3xl">
        <DialogTitle className="flex items-center gap-2.5 font-serif text-lg font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
            <Trash2 className="h-4 w-4" />
          </div>
          <span>Delete Entry?</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to permanently delete this {thought.kind}? This action cannot be undone.
        </DialogDescription>

        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs italic text-muted-foreground line-clamp-2">
          "{thought.body}"
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            className="rounded-2xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
