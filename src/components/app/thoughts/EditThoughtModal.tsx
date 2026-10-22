import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Lock, Globe, Coffee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { IThought } from "@/types/shared";

interface EditThoughtModalProps {
  thought: IThought | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditThoughtModal({
  thought,
  open,
  onOpenChange,
}: EditThoughtModalProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [justVenting, setJustVenting] = useState(false);

  useEffect(() => {
    if (thought) {
      setBody(thought.body);
      setIsShared(thought.visibility === "shared");
      setJustVenting(Boolean(thought.justVenting));
    }
  }, [thought]);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!thought) return;
      return apiFetch(`/thoughts/${thought._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          body: body.trim(),
          visibility: isShared ? "shared" : "private",
          justVenting,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Entry updated successfully ✨");
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update entry.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Text cannot be empty.");
      return;
    }
    editMutation.mutate();
  };

  if (!thought) return null;

  const isInsecurity = thought.kind === "insecurity";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-border/70 bg-card/95 text-foreground backdrop-blur-2xl shadow-panel p-6 sm:rounded-3xl"
      >
        <DialogTitle className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
          <span>Edit {isInsecurity ? "Vulnerability" : "Thought"}</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Make adjustments to your thoughts or privacy preferences.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Edit your words..."
            className="w-full rounded-2xl border border-border/70 bg-background/60 p-3.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
          />

          {/* Visibility toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-3 text-xs">
            <div className="flex items-center gap-2">
              {isShared ? (
                <Globe className="h-4 w-4 text-emerald-500" />
              ) : (
                <Lock className="h-4 w-4 text-amber-500" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {isShared ? "Shared with partner" : "Private only to me"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isShared
                    ? "Visible in your partner's feed"
                    : "Hidden securely in your private space"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isShared ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isShared ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Just venting flag (for thoughts) */}
          {!isInsecurity && (
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    Just venting, don't fix it
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Signals that you just need to let it out without advice
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setJustVenting(!justVenting)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  justVenting ? "bg-amber-500" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    justVenting ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-border/70 bg-background/60 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className={`rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                isInsecurity
                  ? "bg-gradient-to-r from-purple-500 to-rose-500"
                  : "bg-gradient-to-r from-[#E5A962] to-[#E07A5F]"
              }`}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
