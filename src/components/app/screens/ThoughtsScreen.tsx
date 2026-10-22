import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Lock,
  Globe,
  Heart,
  Send,
  Coffee,
  Trash2,
  Edit3,
  AlertCircle,
  MessageCircle,
  Shield,
  Smile,
  CheckCircle2,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { apiFetch, getStoredUser } from "@/lib/api";
import { IThought, ThoughtKind, ThoughtVisibility } from "@/types/shared";
import { EditThoughtModal } from "../thoughts/EditThoughtModal";
import { DeleteConfirmDialog } from "../thoughts/DeleteConfirmDialog";

interface CoupleResponse {
  couple: {
    _id: string;
    startDate: string;
  };
  user: {
    _id: string;
    name: string;
    role: "her" | "him";
    avatarUrl?: string;
  };
  partner: {
    _id: string;
    name: string;
    role: "her" | "him";
    avatarUrl?: string;
  } | null;
}

const THOUGHT_REACTIONS = ["❤️", "😂", "🫂", "✨", "👏", "🥹"];

export function ThoughtsScreen() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();

  // Top tabs: "thought" | "insecurity"
  const [activeTab, setActiveTab] = useState<ThoughtKind>("thought");

  // Filter inside the tab: "all" | "shared" | "private"
  const [filter, setFilter] = useState<"all" | "shared" | "private">("all");

  // Thoughts Composer state
  const [thoughtBody, setThoughtBody] = useState("");
  const [thoughtJustVenting, setThoughtJustVenting] = useState(false);

  // Insecurities Composer state
  const [insecurityBody, setInsecurityBody] = useState("");
  const [insecurityShareWithPartner, setInsecurityShareWithPartner] = useState(false);

  // Modals state
  const [editingThought, setEditingThought] = useState<IThought | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingThought, setDeletingThought] = useState<IThought | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Insecurity response note state: { [thoughtId]: string }
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});

  // Fetch Couple profile
  const { data: coupleData } = useQuery<CoupleResponse>({
    queryKey: ["couple"],
    queryFn: () => apiFetch("/couple"),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch thoughts list
  const { data: thoughts = [], isLoading: isLoadingThoughts } = useQuery<IThought[]>({
    queryKey: ["thoughts"],
    queryFn: () => apiFetch("/thoughts"),
  });

  // Mutations
  const createThoughtMutation = useMutation({
    mutationFn: async (data: {
      body: string;
      kind: ThoughtKind;
      visibility?: ThoughtVisibility;
      justVenting?: boolean;
    }) => {
      return apiFetch("/thoughts", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newEntry: IThought) => {
      toast.success(
        newEntry.kind === "insecurity"
          ? newEntry.visibility === "shared"
            ? "Vulnerability shared with your partner 🤍"
            : "Saved privately in your personal sanctuary 🔒"
          : "Thought shared ✨"
      );
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });

      if (newEntry.kind === "thought") {
        setThoughtBody("");
        setThoughtJustVenting(false);
      } else {
        setInsecurityBody("");
        setInsecurityShareWithPartner(false);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post entry.");
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({
      thoughtId,
      visibility,
    }: {
      thoughtId: string;
      visibility: ThoughtVisibility;
    }) => {
      return apiFetch(`/thoughts/${thoughtId}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
      });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.visibility === "shared"
          ? "Now shared with your partner 🤍"
          : "Now private to you 🔒"
      );
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update sharing preference.");
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({
      thoughtId,
      emoji,
      note,
    }: {
      thoughtId: string;
      emoji?: string;
      note?: string;
    }) => {
      return apiFetch(`/thoughts/${thoughtId}/responses`, {
        method: "POST",
        body: JSON.stringify({ emoji, note }),
      });
    },
    onSuccess: (_, vars) => {
      if (vars.emoji === "🤍" && !vars.note) {
        toast.success("Sent 🤍 reassurance to your partner");
      } else if (vars.note) {
        toast.success("Supportive words sent with care 🤍");
        setResponseNotes((prev) => ({ ...prev, [vars.thoughtId]: "" }));
      } else {
        toast.success("Reaction added ✨");
      }
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send response.");
    },
  });

  // Filter entries for the current tab
  const currentTabEntries = thoughts.filter((t) => t.kind === activeTab);
  const filteredEntries = currentTabEntries.filter((t) => {
    if (filter === "shared") return t.visibility === "shared";
    if (filter === "private") return t.visibility === "private";
    return true;
  });

  const getAuthorDisplay = (userId: string) => {
    const isMe = currentUser?.id === userId;
    const name = isMe
      ? coupleData?.user?.name || "You"
      : coupleData?.partner?.name || "Partner";
    const role = isMe ? coupleData?.user?.role : coupleData?.partner?.role;
    const isHim = role === "him" || (!role && name.toLowerCase().includes("aman"));

    return {
      name,
      isMe,
      avatarColor: isHim
        ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
        : "bg-rose-500/20 text-rose-300 border-rose-400/40",
      accentText: isHim ? "text-amber-300" : "text-rose-300",
    };
  };

  return (
    <div className="space-y-5 pb-32">
      {/* Edit & Delete Dialogs */}
      <EditThoughtModal
        thought={editingThought}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <DeleteConfirmDialog
        thought={deletingThought}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Thoughts &amp; Insecurities
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeTab === "thought"
              ? "A no-filter space to express whatever is on your mind"
              : "A gentler, sacred space for vulnerabilities and tenderness"}
          </p>
        </div>
      </div>

      {/* Primary Tabs (Thoughts vs Insecurities) */}
      <div className="grid grid-cols-2 rounded-2xl border border-border/70 bg-card/80 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab("thought");
            setFilter("all");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
            activeTab === "thought"
              ? "bg-accent/15 font-bold text-accent shadow-xs border border-accent/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>💭</span>
          <span>Thoughts ({thoughts.filter((t) => t.kind === "thought").length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("insecurity");
            setFilter("all");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
            activeTab === "insecurity"
              ? "bg-purple-500/15 font-bold text-purple-700 shadow-xs border border-purple-400/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>🕊️</span>
          <span>Insecurities ({thoughts.filter((t) => t.kind === "insecurity").length})</span>
        </button>
      </div>

      {/* ===================== TAB 1: THOUGHTS ===================== */}
      {activeTab === "thought" && (
        <div className="space-y-4">
          {/* Big Composer: "Say it without a second thought" */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-card to-secondary/30 p-5 shadow-panel"
          >
            <textarea
              rows={3}
              value={thoughtBody}
              onChange={(e) => setThoughtBody(e.target.value)}
              placeholder="Say it without a second thought..."
              className="w-full resize-none rounded-2xl border border-border/70 bg-background/60 p-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-amber-400/60 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              {/* "Just venting, don't fix it" toggle */}
              <button
                type="button"
                onClick={() => setThoughtJustVenting(!thoughtJustVenting)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all ${
                  thoughtJustVenting
                    ? "border-accent bg-accent/20 font-bold text-accent shadow-sm"
                    : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Coffee className="h-3.5 w-3.5" />
                <span>Just venting, don't fix it</span>
              </button>

              {/* One-tap Share */}
              <button
                type="button"
                disabled={!thoughtBody.trim() || createThoughtMutation.isPending}
                onClick={() =>
                  createThoughtMutation.mutate({
                    body: thoughtBody.trim(),
                    kind: "thought",
                    visibility: "shared",
                    justVenting: thoughtJustVenting,
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400 px-5 py-2 text-xs font-bold text-[#0e0d15] shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {createThoughtMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Share Thought</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Sub-filter chips (All, Shared, Private) */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Showing:</span>
            <div className="flex gap-1.5">
              {(["all", "shared", "private"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-xl border px-3 py-1 capitalize transition-all ${
                    filter === tab
                      ? "border-accent bg-accent/20 font-bold text-accent"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          {isLoadingThoughts ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <p className="text-xs">Gathering thoughts...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-background/50 p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-amber-400/60" />
              <h4 className="mt-3 font-serif text-base font-semibold text-foreground">
                No thoughts logged yet
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Say whatever is bouncing around in your mind without second-guessing.
              </p>
            </div>
          ) : (
            filteredEntries.map((thought) => {
              const author = getAuthorDisplay(thought.userId);
              const partnerCanReact = !author.isMe && thought.visibility === "shared";

              return (
                <motion.article
                  key={thought._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-panel backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl border text-xs font-bold ${author.avatarColor}`}
                      >
                        {author.name[0]}
                      </div>
                      <div>
                        <h4 className="font-serif text-sm font-semibold text-foreground">
                          {author.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(thought.createdAt.toString()), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {thought.justVenting && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          <Coffee className="h-3 w-3" />
                          Just venting, don't fix it
                        </span>
                      )}

                      {/* Author Controls */}
                      {author.isMe && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThought(thought);
                              setIsEditOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-amber-300 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingThought(thought);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-3.5 font-sans text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {thought.body}
                  </p>

                  {/* Emoji Reactions Section (Partner can react with an emoji, NO prompt to reply) */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {THOUGHT_REACTIONS.map((emoji) => {
                        const count = thought.responses.filter((r) => r.emoji === emoji).length;
                        const hasReacted = thought.responses.some(
                          (r) => r.emoji === emoji && r.userId === currentUser?.id
                        );

                        return (
                          <button
                            key={emoji}
                            type="button"
                            disabled={!partnerCanReact}
                            onClick={() =>
                              addReactionMutation.mutate({
                                thoughtId: thought._id,
                                emoji,
                              })
                            }
                            className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-all active:scale-95 ${
                              hasReacted
                                ? "border-accent bg-accent/20 font-bold text-accent shadow-sm"
                                : count > 0
                                ? "border-border/70 bg-card/80 text-foreground/80"
                                : partnerCanReact
                                ? "border-border/70 bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground"
                                : "hidden"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="text-[10px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {author.isMe && (
                      <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        {thought.visibility === "shared" ? (
                          <>
                            <Globe className="h-3 w-3 text-emerald-400" />
                            <span>Shared</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 text-amber-400" />
                            <span>Private</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </motion.article>
              );
            })
          )}
        </div>
      )}

      {/* ===================== TAB 2: INSECURITIES (Gentler Space) ===================== */}
      {activeTab === "insecurity" && (
        <div className="space-y-4">
          {/* Calming, Softer Palette Composer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/15 via-card to-secondary/30 p-5 shadow-panel"
          >
            <div className="flex items-center gap-2 text-purple-700 text-xs font-semibold mb-2">
              <span className="text-base">🕊️</span>
              <span>A Tender Space to Exhale</span>
            </div>

            <textarea
              rows={3}
              value={insecurityBody}
              onChange={(e) => setInsecurityBody(e.target.value)}
              placeholder="What feels tender, quiet, or heavy on your heart right now?"
              className="w-full resize-none rounded-2xl border border-border/70 bg-background/60 p-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-purple-400/60 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              {/* Default Private + "Share with my partner" Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInsecurityShareWithPartner(!insecurityShareWithPartner)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    insecurityShareWithPartner
                      ? "border-purple-400 bg-purple-400/20 text-purple-800 shadow-sm"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
                  }`}
                >
                  {insecurityShareWithPartner ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-purple-600" />
                      <span>Share with my partner</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-accent" />
                      <span>Keep private to me</span>
                    </>
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={
                  !insecurityBody.trim() || createThoughtMutation.isPending
                }
                onClick={() =>
                  createThoughtMutation.mutate({
                    body: insecurityBody.trim(),
                    kind: "insecurity",
                    visibility: insecurityShareWithPartner ? "shared" : "private",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-rose-400 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {createThoughtMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : insecurityShareWithPartner ? (
                  <>
                    <span>🤍</span>
                    <span>Share with Partner</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Save Privately</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Sub-filter chips */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Showing:</span>
            <div className="flex gap-1.5">
              {(["all", "shared", "private"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-xl border px-3 py-1 capitalize transition-all ${
                    filter === tab
                      ? "border-purple-400 bg-purple-400/20 font-bold text-purple-800"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:bg-card"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Insecurities Feed */}
          {isLoadingThoughts ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <p className="text-xs">Gathering sacred space...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-500/20 bg-purple-500/[0.02] p-10 text-center">
              <Heart className="mx-auto h-8 w-8 text-purple-400/60" />
              <h4 className="mt-3 font-serif text-base font-semibold text-purple-100">
                No vulnerabilities logged
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Whenever you feel anxious, unsure, or quiet, this space holds your feelings with unconditional tenderness.
              </p>
            </div>
          ) : (
            filteredEntries.map((thought) => {
              const author = getAuthorDisplay(thought.userId);
              const isPartner = !author.isMe;

              // 3-day nudge check
              const daysSinceCreated = differenceInDays(
                new Date(),
                parseISO(thought.createdAt.toString())
              );
              const showThreeDayNudge =
                thought.visibility === "shared" &&
                isPartner &&
                daysSinceCreated >= 3;

              return (
                <motion.article
                  key={thought._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-purple-400/30 bg-gradient-to-b from-card via-card to-secondary/30 p-5 shadow-panel backdrop-blur-md"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl border text-xs font-bold ${
                          author.isMe
                            ? "bg-purple-500/20 text-purple-200 border-purple-400/30"
                            : "bg-rose-500/20 text-rose-200 border-rose-400/30"
                        }`}
                      >
                        {author.name[0]}
                      </div>
                      <div>
                        <h4 className="font-serif text-sm font-semibold text-foreground">
                          {author.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(thought.createdAt.toString()), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Privacy Badge & Inline Toggle for Author */}
                      {author.isMe ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleVisibilityMutation.mutate({
                              thoughtId: thought._id,
                              visibility:
                                thought.visibility === "shared" ? "private" : "shared",
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                            thought.visibility === "shared"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {thought.visibility === "shared" ? (
                            <>
                              <Globe className="h-3 w-3" />
                              <span>Shared with partner</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Private only</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-200">
                          🤍 Shared with you
                        </span>
                      )}

                      {/* Author Edit & Delete */}
                      {author.isMe && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThought(thought);
                              setIsEditOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-purple-300 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingThought(thought);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Text */}
                  <p className="mt-3.5 font-sans text-sm leading-relaxed text-purple-50/90 whitespace-pre-wrap">
                    {thought.body}
                  </p>

                  {/* 3-Day Check-in Nudge for Partner */}
                  {showThreeDayNudge && (
                    <div className="mt-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center justify-between text-xs text-rose-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🫂</span>
                        <span className="font-semibold">
                          Check in with {author.name} about what she shared 3 days ago.
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-300 uppercase tracking-wider font-bold">
                        Gentle Nudge
                      </span>
                    </div>
                  )}

                  {/* Partner Responses List (No threads, no debate) */}
                  {thought.responses && thought.responses.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                      {thought.responses.map((resp, rIdx) => (
                        <div
                          key={rIdx}
                          className="rounded-2xl border border-purple-400/30 bg-purple-500/[0.08] p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-purple-700 flex items-center gap-1.5">
                              <span>🤍</span>
                              <span>Supportive Reassurance</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(resp.createdAt.toString()), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {resp.note && (
                            <p className="mt-1.5 text-purple-100 font-sans leading-relaxed">
                              "{resp.note}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Partner Response Section: Only 🤍 or short supportive note (max 200 chars).
                      Hint: "Listen first. You don't need to fix anything." */}
                  {isPartner && thought.visibility === "shared" && (
                    <div className="mt-4 border-t border-border/60 pt-3 space-y-2.5">
                      {/* Hint above response box */}
                      <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-medium italic">
                        <Info className="h-3.5 w-3.5 text-purple-600" />
                        <span>Listen first. You don't need to fix anything.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Instant 🤍 Reassurance Button */}
                        <button
                          type="button"
                          disabled={addReactionMutation.isPending}
                          onClick={() =>
                            addReactionMutation.mutate({
                              thoughtId: thought._id,
                              emoji: "🤍",
                            })
                          }
                          className="flex h-9 items-center gap-1 rounded-2xl border border-purple-400/30 bg-purple-500/10 px-3 text-xs font-bold text-purple-800 shadow-sm hover:bg-purple-500/20 active:scale-95 transition-all"
                        >
                          <span>🤍</span>
                          <span>Send Reassurance</span>
                        </button>

                        {/* Short supportive note input (max 200 characters) */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            maxLength={200}
                            value={responseNotes[thought._id] || ""}
                            onChange={(e) =>
                              setResponseNotes((prev) => ({
                                ...prev,
                                [thought._id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const note = responseNotes[thought._id]?.trim();
                                if (note) {
                                  addReactionMutation.mutate({
                                    thoughtId: thought._id,
                                    emoji: "🤍",
                                    note,
                                  });
                                }
                              }
                            }}
                            placeholder="Write a tender note (max 200 chars)..."
                            className="w-full rounded-2xl border border-purple-500/20 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-purple-400/50 focus:outline-none pr-10"
                          />

                          <button
                            type="button"
                            disabled={
                              !responseNotes[thought._id]?.trim() ||
                              addReactionMutation.isPending
                            }
                            onClick={() => {
                              const note = responseNotes[thought._id]?.trim();
                              if (note) {
                                addReactionMutation.mutate({
                                  thoughtId: thought._id,
                                  emoji: "🤍",
                                  note,
                                });
                              }
                            }}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-xl bg-purple-500 text-white shadow-sm disabled:opacity-40"
                          >
                            <Send className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
