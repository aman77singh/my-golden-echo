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
        ? "bg-amber-100 text-amber-900 border-amber-200"
        : "bg-rose-100 text-rose-900 border-rose-200",
      accentText: isHim ? "text-amber-800" : "text-rose-800",
    };
  };

  return (
    <div className="thoughts-screen space-y-5 pb-32">
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
              ? "border border-accent bg-accent font-bold text-accent-foreground shadow-sm"
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
              ? "border border-violet-700 bg-violet-700 font-bold text-white shadow-sm"
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
            className="rounded-3xl border border-accent/35 bg-gradient-to-br from-[#FFF4E8] via-card to-[#F8E7D8] p-5 shadow-panel"
          >
            <textarea
              rows={3}
              value={thoughtBody}
              onChange={(e) => setThoughtBody(e.target.value)}
              placeholder="Say it without a second thought..."
              className="w-full resize-none rounded-2xl border border-border bg-background/90 p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-md shadow-accent/20 transition-all hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:bg-[#F2D6BB] disabled:text-[#604431] disabled:opacity-100"
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
                      ? "border-accent bg-accent font-bold text-accent-foreground shadow-sm"
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
            <div className="rounded-3xl border border-dashed border-accent/30 bg-card/75 p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-accent" />
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
            className="rounded-3xl border border-violet-300 bg-gradient-to-br from-[#F5F0FF] via-card to-[#F8E7EE] p-5 shadow-panel"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-900">
              <span className="text-base">🕊️</span>
              <span>A Tender Space to Exhale</span>
            </div>

            <textarea
              rows={3}
              value={insecurityBody}
              onChange={(e) => setInsecurityBody(e.target.value)}
              placeholder="What feels tender, quiet, or heavy on your heart right now?"
              className="w-full resize-none rounded-2xl border border-violet-200 bg-background/90 p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
                      ? "border-violet-700 bg-violet-700 text-white shadow-sm"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-900/20 transition-all hover:bg-violet-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55"
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
                      ? "border-violet-700 bg-violet-700 font-bold text-white shadow-sm"
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
            <div className="rounded-3xl border border-dashed border-violet-300 bg-[#F7F3FC] p-10 text-center">
              <Heart className="mx-auto h-8 w-8 text-violet-700" />
              <h4 className="mt-3 font-serif text-base font-semibold text-violet-950">
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
                  className="rounded-3xl border border-violet-200 bg-gradient-to-b from-[#FCFAFF] via-card to-[#F5F0FA] p-5 shadow-panel"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl border text-xs font-bold ${
                          author.isMe
                            ? "border-violet-200 bg-violet-100 text-violet-900"
                            : "border-rose-200 bg-rose-100 text-rose-900"
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
                              ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                              : "border-amber-200 bg-amber-100 text-amber-900"
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold text-violet-900">
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
                            className="p-1 text-muted-foreground transition-colors hover:text-violet-800"
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
                  <p className="mt-3.5 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {thought.body}
                  </p>

                  {/* 3-Day Check-in Nudge for Partner */}
                  {showThreeDayNudge && (
                    <div className="mt-3.5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🫂</span>
                        <span className="font-semibold">
                          Check in with {author.name} about what she shared 3 days ago.
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
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
                          className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold text-violet-900">
                              <span>🤍</span>
                              <span>Supportive Reassurance</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(resp.createdAt.toString()), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {resp.note && (
                            <p className="mt-1.5 font-sans leading-relaxed text-foreground">
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
                      <div className="flex items-center gap-1.5 text-[11px] font-medium italic text-violet-900">
                        <Info className="h-3.5 w-3.5 text-violet-800" />
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
                          className="flex h-9 items-center gap-1 rounded-2xl border border-violet-300 bg-violet-100 px-3 text-xs font-bold text-violet-950 shadow-sm transition-all hover:bg-violet-200 active:scale-95"
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
                            className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-xl bg-violet-800 text-white shadow-sm transition-colors hover:bg-violet-900 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:text-violet-900 disabled:opacity-100"
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
