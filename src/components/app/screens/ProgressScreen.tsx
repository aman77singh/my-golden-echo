import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Flame,
  Award,
  Heart,
  MessageSquare,
  Sparkles,
  Calendar,
  Target,
  Send,
  Mic,
  Square,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  PartyPopper,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, addDays } from "date-fns";

import { apiFetch, getStoredUser } from "@/lib/api";
import { IGoal, IProgressPost, IProgressReply } from "@/types/shared";
import { NewPostSheet } from "../progress/NewPostSheet";
import { NewGoalModal } from "../progress/NewGoalModal";
import { ProgressArchiveModal } from "../progress/ProgressArchiveModal";
import { ConfettiCelebration } from "../progress/ConfettiCelebration";
import { VoiceNotePlayer } from "../chat/VoiceNotePlayer";
import { uploadVoiceNote } from "@/lib/mediaUpload";

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

interface WeeklySummary {
  daysPosted: number;
  totalCount: number;
  cheersReceived: number;
  totalMinutes: number;
  weekStart: string;
  weekEnd: string;
}

const REACTION_EMOJIS = ["🔥", "👏", "💪", "🥹"];

const STANDARD_CHEERS = [
  "Proud of you",
  "Keep going",
  "That's huge",
  "Rest now, you earned it",
];

const STRUGGLED_CHEERS = [
  "That sounds hard, I'm here",
  "You did amazing anyway",
  "Take a deep breath, so proud of you",
  "Proud of you for trying",
];

export function ProgressScreen() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();

  // Active view tab: "feed" | "goals"
  const [activeTab, setActiveTab] = useState<"feed" | "goals">("feed");

  // Modals state
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [celebrateGoal, setCelebrateGoal] = useState<IGoal | null>(null);

  // Expanded replies per post
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Inline reply text draft per post
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Voice recording state for inline replies: { [postId]: { isRecording, duration, recorder, chunks } }
  const [activeVoiceReplyPostId, setActiveVoiceReplyPostId] = useState<string | null>(null);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);

  // Is today Sunday?
  const isSunday = new Date().getDay() === 0;
  const [showWeeklyCard, setShowWeeklyCard] = useState(true);

  // Queries
  const { data: coupleData } = useQuery<CoupleResponse>({
    queryKey: ["couple"],
    queryFn: () => apiFetch("/couple"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<IProgressPost[]>({
    queryKey: ["progress"],
    queryFn: () => apiFetch("/progress"),
  });

  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<IGoal[]>({
    queryKey: ["goals"],
    queryFn: () => apiFetch("/goals"),
  });

  const { data: weeklySummary } = useQuery<WeeklySummary>({
    queryKey: ["progress", "summary", "weekly"],
    queryFn: () => apiFetch("/progress/summary/weekly"),
  });

  // Map of goalId -> IGoal
  const goalsMap = useMemo(() => {
    const map = new Map<string, IGoal>();
    for (const g of goals) {
      map.set(g._id, g);
    }
    return map;
  }, [goals]);

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch("/progress", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newPost: IProgressPost) => {
      toast.success("Progress post shared!");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "summary", "weekly"] });
      setNewPostOpen(false);

      // Check if attached goal reached 100%
      if (newPost.goalId) {
        const goal = goalsMap.get(newPost.goalId);
        if (goal && goal.targetCount) {
          const projectedCount = (goal.currentCount || 0) + (newPost.countAdded || 1);
          if (projectedCount >= goal.targetCount) {
            setCelebrateGoal(goal);
          }
        }
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to publish post.");
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ postId, emoji }: { postId: string; emoji: string }) => {
      return apiFetch(`/progress/${postId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update reaction.");
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: async ({
      postId,
      body,
      voiceUrl,
      quickCheer,
    }: {
      postId: string;
      body?: string;
      voiceUrl?: string;
      quickCheer?: string;
    }) => {
      return apiFetch(`/progress/${postId}/replies`, {
        method: "POST",
        body: JSON.stringify({ body, voiceUrl, quickCheer }),
      });
    },
    onSuccess: (_, vars) => {
      toast.success("Encouragement sent! ❤️");
      setReplyDrafts((prev) => ({ ...prev, [vars.postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send reply.");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async ({ postId, replyId }: { postId: string; replyId: string }) => {
      return apiFetch(`/progress/${postId}/replies/${replyId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Reply removed");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete reply.");
    },
  });

  // Voice note recording for reply
  const startVoiceReply = async (postId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      voiceRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setActiveVoiceReplyPostId(postId);
      setVoiceRecordingSeconds(0);

      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access is needed for voice notes.");
    }
  };

  const stopVoiceReplyAndSend = async (postId: string) => {
    if (!voiceRecorderRef.current) return;
    const recorder = voiceRecorderRef.current;

    recorder.onstop = async () => {
      clearInterval(voiceTimerRef.current);
      const audioBlob = new Blob(voiceChunksRef.current, { type: "audio/webm" });
      recorder.stream.getTracks().forEach((track) => track.stop());
      setActiveVoiceReplyPostId(null);

      try {
        toast.loading("Sending voice cheer...", { id: "voice-reply" });
        const voiceUrl = await uploadVoiceNote(audioBlob);
        await addReplyMutation.mutateAsync({
          postId,
          voiceUrl,
          quickCheer: "🎤 Voice Cheer",
        });
        toast.dismiss("voice-reply");
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload voice reply.", { id: "voice-reply" });
      }
    };

    recorder.stop();
  };

  const cancelVoiceReply = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(voiceTimerRef.current);
    setActiveVoiceReplyPostId(null);
    setVoiceRecordingSeconds(0);
  };

  // Helper to determine author visual style
  const getAuthorInfo = (userId: string) => {
    const isMe = currentUser?.id === userId;
    const authorName = isMe
      ? coupleData?.user?.name || "You"
      : coupleData?.partner?.name || "Partner";
    const role = isMe ? coupleData?.user?.role : coupleData?.partner?.role;
    const isHim = role === "him" || (!role && authorName.toLowerCase().includes("aman"));

    return {
      name: authorName,
      isMe,
      avatarColor: isHim
        ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
        : "bg-rose-500/20 text-rose-300 border-rose-400/40",
      accentText: isHim ? "text-amber-300" : "text-rose-300",
      badgeColor: isHim
        ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
        : "bg-rose-400/10 text-rose-300 border-rose-400/20",
    };
  };

  return (
    <div className="space-y-5 pb-32">
      {/* 100% Celebration Canvas */}
      {celebrateGoal && (
        <ConfettiCelebration
          goalTitle={celebrateGoal.title}
          targetCount={celebrateGoal.targetCount}
          unit={celebrateGoal.unit}
          onClose={() => setCelebrateGoal(null)}
        />
      )}

      {/* Top Header & Action Row */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Progress Wall
          </h2>
          <p className="text-xs text-muted-foreground">
            Sharing daily triumphs, cheering through every challenge
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            title="View Archive Calendar"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground transition-all hover:bg-white/10 hover:text-amber-300 active:scale-95"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setNewPostOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400 px-3.5 py-2 text-xs font-bold text-[#0e0d15] shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Post Today</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Feed vs Goals) */}
      <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 transition-all ${
            activeTab === "feed"
              ? "bg-amber-400/20 font-bold text-amber-200 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>Daily Stream ({posts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("goals")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 transition-all ${
            activeTab === "goals"
              ? "bg-amber-400/20 font-bold text-amber-200 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>Milestones & Goals ({goals.length})</span>
        </button>
      </div>

      {/* Sunday / Weekly Summary Card */}
      {weeklySummary && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-3xl border ${
            isSunday
              ? "border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-[#1e1c2b] to-rose-500/10 shadow-xl shadow-amber-500/10"
              : "border-white/10 bg-[#161522]/90"
          } p-4 text-foreground`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                  isSunday
                    ? "bg-amber-400 text-[#0e0d15] shadow-md shadow-amber-400/30"
                    : "bg-white/10 text-amber-300"
                }`}
              >
                <Sparkles className="h-4 w-4 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm font-bold text-foreground">
                    {isSunday ? "Sunday Celebration Recap ☀️" : "This Week's Momentum"}
                  </h3>
                  {isSunday && (
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Today!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {format(parseISO(weeklySummary.weekStart), "MMM d")} –{" "}
                  {format(parseISO(weeklySummary.weekEnd), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWeeklyCard(!showWeeklyCard)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              {showWeeklyCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showWeeklyCard && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Days Active
                </span>
                <p className="font-serif text-xl font-bold text-amber-300">
                  {weeklySummary.daysPosted}{" "}
                  <span className="text-xs font-normal text-muted-foreground">/ 7</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Count Done
                </span>
                <p className="font-serif text-xl font-bold text-foreground">
                  +{weeklySummary.totalCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cheers Given
                </span>
                <p className="font-serif text-xl font-bold text-rose-300">
                  {weeklySummary.cheersReceived} ❤️
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ===================== TAB 1: DAILY STREAM (FEED) ===================== */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {isLoadingPosts ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <p className="text-xs">Gathering updates...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-amber-400/60" />
              <h4 className="mt-3 font-serif text-base font-semibold text-foreground">
                No progress posts yet today
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Did you finish a chapter, do a workout, or tackle a task? Share it first!
              </p>
              <button
                type="button"
                onClick={() => setNewPostOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-amber-400/20 px-4 py-2 text-xs font-bold text-amber-200 border border-amber-400/40 hover:bg-amber-400/30"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Update</span>
              </button>
            </div>
          ) : (
            posts.map((post) => {
              const author = getAuthorInfo(post.userId);
              const isRepliesOpen = expandedReplies[post._id] ?? true;
              const attachedGoal = post.goalId ? goalsMap.get(post.goalId) : null;
              const hasVoiceReplyRecording = activeVoiceReplyPostId === post._id;

              return (
                <motion.article
                  key={post._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-white/10 bg-[#161522]/90 p-5 shadow-lg backdrop-blur-md"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-2xl border font-bold text-sm ${author.avatarColor}`}
                      >
                        {author.name[0]}
                      </div>
                      <div>
                        <h4 className="font-serif text-sm font-semibold text-foreground">
                          {author.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(post.createdAt.toString()), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-foreground/80">
                        {post.category}
                      </span>
                      {post.struggled && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          <Flame className="h-3 w-3 fill-current" />
                          Struggled today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Text */}
                  <p className="mt-3.5 font-sans text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {post.body}
                  </p>

                  {/* Optional Media Photo */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      <img
                        src={post.mediaUrls[0]}
                        alt="Progress attachment"
                        className="max-h-72 w-full object-cover transition-transform hover:scale-105 duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Optional Voice Note Attachment */}
                  {post.voiceUrl && (
                    <div className="mt-3">
                      <VoiceNotePlayer voiceUrl={post.voiceUrl} isMe={author.isMe} />
                    </div>
                  )}

                  {/* Metrics Row (Goal, Count, Minutes) */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                    {post.countAdded !== undefined && post.countAdded > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-300">
                        <TrendingUp className="h-3 w-3" />+{post.countAdded}{" "}
                        {attachedGoal?.unit || "done"}
                      </span>
                    )}
                    {post.minutes !== undefined && post.minutes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {post.minutes} mins
                      </span>
                    )}
                    {attachedGoal && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-rose-300">
                        <Target className="h-3 w-3" />
                        {attachedGoal.title}
                      </span>
                    )}
                  </div>

                  {/* Reaction Bar */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {REACTION_EMOJIS.map((emoji) => {
                        const count = post.reactions.filter((r) => r.emoji === emoji).length;
                        const hasReacted = post.reactions.some(
                          (r) => r.emoji === emoji && r.userId === currentUser?.id
                        );

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              toggleReactionMutation.mutate({ postId: post._id, emoji })
                            }
                            className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-all active:scale-95 ${
                              hasReacted
                                ? "border-amber-400 bg-amber-400/20 font-bold text-amber-200 shadow-sm"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="text-[11px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => ({
                          ...prev,
                          [post._id]: !isRepliesOpen,
                        }))
                      }
                      className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{post.replies?.length || 0} Replies</span>
                    </button>
                  </div>

                  {/* Inline Replies & Encouragement Section */}
                  {isRepliesOpen && (
                    <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                      {/* Existing Replies List */}
                      {post.replies && post.replies.length > 0 && (
                        <div className="space-y-2">
                          {post.replies.map((reply: IProgressReply, rIdx: number) => {
                            const replyAuthor = getAuthorInfo(reply.userId);
                            const isMyReply = reply.userId === currentUser?.id;

                            return (
                              <div
                                key={rIdx}
                                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-semibold ${replyAuthor.accentText}`}
                                    >
                                      {replyAuthor.name}
                                    </span>
                                    {reply.quickCheer && (
                                      <span className="rounded-lg bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-400/20">
                                        {reply.quickCheer}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(
                                        parseISO(reply.createdAt.toString()),
                                        "h:mm a"
                                      )}
                                    </span>
                                    {isMyReply && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteReplyMutation.mutate({
                                            postId: post._id,
                                            replyId: (reply as any)._id,
                                          })
                                        }
                                        className="text-muted-foreground/60 hover:text-rose-400 opacity-60 hover:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {reply.body && (
                                  <p className="mt-1.5 text-foreground/90 font-sans leading-relaxed">
                                    {reply.body}
                                  </p>
                                )}

                                {reply.voiceUrl && (
                                  <div className="mt-2">
                                    <VoiceNotePlayer
                                      voiceUrl={reply.voiceUrl}
                                      isMe={isMyReply}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick-Tap Cheers Row (Adaptive based on struggled flag) */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 mb-1.5">
                          <span>Quick encouragement:</span>
                          <span className="italic text-[10px] text-amber-300/80">
                            Mention one specific thing that impressed you
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {(post.struggled ? STRUGGLED_CHEERS : STANDARD_CHEERS).map(
                            (cheerText) => (
                              <button
                                key={cheerText}
                                type="button"
                                onClick={() =>
                                  addReplyMutation.mutate({
                                    postId: post._id,
                                    quickCheer: cheerText,
                                    body: cheerText,
                                  })
                                }
                                className={`rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-95 ${
                                  post.struggled
                                    ? "border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
                                    : "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                                }`}
                              >
                                {cheerText}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Inline Reply Composer */}
                      <div className="mt-2 space-y-2">
                        {hasVoiceReplyRecording ? (
                          <div className="flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs">
                            <div className="flex items-center gap-2 text-rose-300">
                              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                              <span className="font-semibold">
                                Recording voice cheer: {voiceRecordingSeconds}s
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={cancelVoiceReply}
                                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-muted-foreground hover:bg-white/10"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => stopVoiceReplyAndSend(post._id)}
                                className="flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-1 font-bold text-white shadow-md active:scale-95"
                              >
                                <Square className="h-3 w-3 fill-current" />
                                <span>Send Voice</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={replyDrafts[post._id] || ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [post._id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  const text = replyDrafts[post._id]?.trim();
                                  if (text) {
                                    addReplyMutation.mutate({
                                      postId: post._id,
                                      body: text,
                                    });
                                  }
                                }
                              }}
                              placeholder="Write a heartfelt reply..."
                              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-amber-400/50 focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => startVoiceReply(post._id)}
                              title="Send voice cheer"
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-amber-300 hover:bg-white/10 active:scale-95"
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={
                                !replyDrafts[post._id]?.trim() ||
                                addReplyMutation.isPending
                              }
                              onClick={() => {
                                const text = replyDrafts[post._id]?.trim();
                                if (text) {
                                  addReplyMutation.mutate({
                                    postId: post._id,
                                    body: text,
                                  });
                                }
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-[#0e0d15] shadow-md transition-transform active:scale-95 disabled:opacity-40"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.article>
              );
            })
          )}
        </div>
      )}

      {/* ===================== TAB 2: GOALS & MILESTONES ===================== */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                Shared Goals & Targets
              </h3>
              <p className="text-xs text-muted-foreground">
                Watch every step add up to our dreams
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewGoalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Goal</span>
            </button>
          </div>

          {isLoadingGoals ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <p className="text-xs">Loading shared targets...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
              <Target className="mx-auto h-8 w-8 text-amber-400/60" />
              <h4 className="mt-3 font-serif text-base font-semibold text-foreground">
                No active goals yet
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a shared goal (e.g. read 20 chapters, run 50 km) to track progress automatically!
              </p>
              <button
                type="button"
                onClick={() => setNewGoalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 px-4 py-2 text-xs font-bold text-[#0e0d15] shadow-md hover:scale-105 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Your First Goal</span>
              </button>
            </div>
          ) : (
            goals.map((goal) => {
              const current = goal.currentCount || 0;
              const target = goal.targetCount || 10;
              const percent = Math.min(100, Math.round((current / target) * 100));
              const isCompleted = percent >= 100 || goal.status === "completed";

              // Filter posts attached to this goal to build activity histogram
              const goalPosts = posts.filter((p) => p.goalId === goal._id);

              // Calculate Pace & Estimated Finish Date
              let paceText = "Pace: In progress";
              let estFinishDate: string | null = null;

              if (goal.createdAt && current > 0) {
                const daysActive = Math.max(
                  1,
                  differenceInDays(new Date(), parseISO(goal.createdAt.toString()))
                );
                const dailyPace = current / daysActive;
                const remaining = Math.max(0, target - current);

                if (dailyPace > 0 && remaining > 0) {
                  const estDays = Math.ceil(remaining / dailyPace);
                  const finish = addDays(new Date(), estDays);
                  estFinishDate = format(finish, "MMM d, yyyy");
                  paceText = `~${dailyPace.toFixed(1)} ${goal.unit || "units"}/day`;
                } else if (remaining === 0) {
                  paceText = "Target fully achieved! 🎉";
                }
              }

              return (
                <motion.div
                  key={goal._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border p-5 shadow-lg backdrop-blur-md ${
                    isCompleted
                      ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-[#181624] to-rose-500/10 shadow-amber-500/10"
                      : "border-white/10 bg-[#161522]/90"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                        {goal.category}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                          <PartyPopper className="h-3 w-3" />
                          100% Completed
                        </span>
                      )}
                    </div>

                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => setCelebrateGoal(goal)}
                        className="flex items-center gap-1 rounded-xl bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/40 hover:bg-amber-400/30"
                      >
                        <Sparkles className="h-3 w-3 fill-current" />
                        <span>Celebrate!</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewPostOpen(true)}
                        className="text-xs font-semibold text-amber-300 hover:underline"
                      >
                        + Log progress
                      </button>
                    )}
                  </div>

                  <h4 className="mt-3 font-serif text-lg font-bold text-foreground">
                    {goal.title}
                  </h4>

                  {/* Progress Bar & Numerical Target */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-300 font-mono text-sm">
                        {current} / {target} {goal.unit || "units"}
                      </span>
                      <span className="text-muted-foreground">{percent}%</span>
                    </div>

                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                      />
                    </div>
                  </div>

                  {/* Chart of Posts Over Time (Histogram) */}
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3 text-amber-400" />
                        Progress Logged ({goalPosts.length} posts)
                      </span>
                      {estFinishDate && !isCompleted && (
                        <span className="text-amber-300/90 font-medium">
                          Est. finish: {estFinishDate}
                        </span>
                      )}
                    </div>

                    {/* Mini visual activity bars */}
                    {goalPosts.length > 0 ? (
                      <div className="flex items-end gap-1.5 h-12 rounded-xl bg-white/[0.02] p-2 border border-white/5">
                        {goalPosts.slice(-14).map((p, idx) => {
                          const barHeight = Math.min(
                            100,
                            Math.max(20, (p.countAdded || 1) * 20)
                          );
                          return (
                            <div
                              key={p._id || idx}
                              title={`${p.countAdded || 1} ${goal.unit} on ${format(
                                parseISO(p.createdAt.toString()),
                                "MMM d"
                              )}`}
                              className="flex-1 flex flex-col items-center justify-end h-full group"
                            >
                              <div
                                style={{ height: `${barHeight}%` }}
                                className="w-full rounded-t-sm bg-gradient-to-t from-amber-500 to-amber-300 opacity-75 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground/60 py-2">
                        No posts linked to this goal yet. Select this goal when posting!
                      </p>
                    )}
                  </div>

                  {/* Milestone Moment Banner */}
                  {isCompleted && (
                    <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                      <div className="flex items-center gap-2 font-serif font-bold">
                        <PartyPopper className="h-4 w-4 text-amber-400" />
                        <span>Milestone Moment!</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        You both crushed this goal! Send your partner a celebratory love note in chat or a special voice message!
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* New Post Sheet Dialog */}
      <NewPostSheet
        open={newPostOpen}
        onOpenChange={setNewPostOpen}
        onSubmitPost={async (data) => {
          await createPostMutation.mutateAsync(data);
        }}
        activeGoals={goals.filter((g) => g.status !== "completed")}
      />

      {/* New Goal Modal */}
      <NewGoalModal open={newGoalOpen} onOpenChange={setNewGoalOpen} />

      {/* Archive Modal */}
      <ProgressArchiveModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        posts={posts}
      />
    </div>
  );
}
