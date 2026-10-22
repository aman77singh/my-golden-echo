import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Heart,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  Reply,
  X,
  Trash2,
  ChevronDown,
  Loader2,
  Square,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, getStoredUser } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  queueOfflineMessage,
  getQueuedMessages,
  removeQueuedMessage,
} from "@/lib/offlineQueue";
import { compressImage, uploadImage, uploadVoiceNote } from "@/lib/mediaUpload";
import { VoiceNotePlayer } from "../chat/VoiceNotePlayer";

interface Reaction {
  userId: string;
  emoji: string;
}

interface MessageItem {
  _id: string;
  tempId?: string;
  coupleId: string;
  senderId: string;
  body?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  replyTo?: any;
  seenAt?: string;
  reactions: Reaction[];
  createdAt: string;
  status?: "sending" | "sent" | "error";
}

interface PingNote {
  _id: string;
  fromId: string;
  body: string;
  kind: string;
  createdAt: string;
}

const REACTION_EMOJIS = ["❤️", "🥰", "✨", "😂", "🥺", "🔥"];

export function ChatScreen() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();

  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Fetch Couple Profile to know partner's name
  const { data: coupleData } = useQuery<{
    partner: { name: string; avatarUrl?: string } | null;
  }>({
    queryKey: ["couple"],
    queryFn: () => apiFetch("/couple"),
  });
  const partnerName = coupleData?.partner?.name || "Aditi";

  // 2. Fetch Latest "Thinking of You" Ping for Pinned Bar
  const { data: pings } = useQuery<PingNote[]>({
    queryKey: ["notes", "pings"],
    queryFn: () => apiFetch("/notes?kind=ping&limit=1"),
    staleTime: 1000 * 30,
  });
  const latestPing = pings && pings.length > 0 ? pings[0] : null;

  // 3. Fetch Messages Feed (paginated chronological)
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<MessageItem[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      const res = await apiFetch<MessageItem[]>("/messages?limit=50");
      // Sort oldest to newest for chronological chat
      return [...res].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
  });

  // 4. Mark messages as seen when chat screen mounts or messages arrive
  useEffect(() => {
    const markSeen = async () => {
      try {
        await apiFetch("/messages/seen", { method: "POST" });
      } catch {}
    };

    markSeen();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") markSeen();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [messages.length]);

  // 5. Auto scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, partnerTyping]);

  // 6. Listen for partner typing events
  useEffect(() => {
    const handleTyping = (e: any) => {
      const data = e.detail;
      if (data && data.userId !== currentUser?.id) {
        setPartnerTyping(Boolean(data.isTyping));
      }
    };

    window.addEventListener("ourspace:typing", handleTyping);
    return () => window.removeEventListener("ourspace:typing", handleTyping);
  }, [currentUser?.id]);

  // 7. Flush Offline Message Queue on Reconnect
  useEffect(() => {
    const flushQueue = async () => {
      const queued = await getQueuedMessages();
      if (queued.length === 0) return;

      toast.info(`Sending ${queued.length} offline message(s)...`);
      for (const msg of queued) {
        try {
          await apiFetch("/messages", {
            method: "POST",
            body: JSON.stringify({
              body: msg.body,
              mediaUrl: msg.mediaUrl,
              voiceUrl: msg.voiceUrl,
              replyTo: msg.replyTo,
            }),
          });
          await removeQueuedMessage(msg.tempId);
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("All offline messages delivered! 💕");
    };

    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [queryClient]);

  // 8. Handle Typing in Composer
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    const socket = getSocket();
    if (socket) {
      socket.emit("typing", { isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { isTyping: false });
      }, 1500);
    }
  };

  // 9. Send Message Mutation with Optimistic Updates & Offline Queue
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      body?: string;
      mediaUrl?: string;
      voiceUrl?: string;
      replyTo?: string;
      tempId: string;
    }) => {
      if (!navigator.onLine) {
        await queueOfflineMessage({
          tempId: payload.tempId,
          coupleId: currentUser?.coupleId,
          senderId: currentUser?.id,
          body: payload.body,
          mediaUrl: payload.mediaUrl,
          voiceUrl: payload.voiceUrl,
          replyTo: payload.replyTo,
          createdAt: new Date().toISOString(),
        });
        toast.info("Saved to offline queue. Will deliver when online! 📡");
        return {
          _id: payload.tempId,
          coupleId: currentUser?.coupleId || "",
          senderId: currentUser?.id || "",
          body: payload.body,
          mediaUrl: payload.mediaUrl,
          voiceUrl: payload.voiceUrl,
          replyTo: payload.replyTo,
          reactions: [],
          createdAt: new Date().toISOString(),
          status: "sending" as const,
        };
      }

      return apiFetch<MessageItem>("/messages", {
        method: "POST",
        body: JSON.stringify({
          body: payload.body,
          mediaUrl: payload.mediaUrl,
          voiceUrl: payload.voiceUrl,
          replyTo: payload.replyTo,
        }),
      });
    },
    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ["messages"] });
      const previous = queryClient.getQueryData<MessageItem[]>(["messages"]) || [];

      const optimisticMsg: MessageItem = {
        _id: newMsg.tempId,
        tempId: newMsg.tempId,
        coupleId: currentUser?.coupleId || "",
        senderId: currentUser?.id || "",
        body: newMsg.body,
        mediaUrl: newMsg.mediaUrl,
        voiceUrl: newMsg.voiceUrl,
        replyTo: replyingTo ? { _id: replyingTo._id, body: replyingTo.body } : undefined,
        reactions: [],
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      queryClient.setQueryData<MessageItem[]>(["messages"], [...previous, optimisticMsg]);
      return { previous };
    },
    onError: (_err, _newMsg, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["messages"], context.previous);
      }
      toast.error("Couldn't deliver message. Please retry.");
    },
    onSuccess: (confirmedMsg, vars) => {
      queryClient.setQueryData<MessageItem[]>(["messages"], (old = []) =>
        old.map((m) =>
          m.tempId === vars.tempId || m._id === vars.tempId
            ? { ...confirmedMsg, status: "sent" }
            : m
        )
      );
      setReplyingTo(null);
    },
  });

  // Send Text Action
  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    sendMessageMutation.mutate({
      body: trimmed,
      replyTo: replyingTo?._id,
      tempId,
    });
    setText("");

    const socket = getSocket();
    if (socket) socket.emit("typing", { isTyping: false });
  };

  // Image Upload Action
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      toast.loading("Compressing & preparing image...", { id: "upload-toast" });

      const compressedBlob = await compressImage(file, 1280, 0.82);
      const uploadedUrl = await uploadImage(compressedBlob);

      toast.dismiss("upload-toast");

      const tempId = `temp-${Date.now()}`;
      sendMessageMutation.mutate({
        mediaUrl: uploadedUrl,
        body: text.trim() || undefined,
        replyTo: replyingTo?._id,
        tempId,
      });

      setText("");
    } catch (err) {
      toast.dismiss("upload-toast");
      toast.error("Image upload failed. Try another picture.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Voice Recording Actions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access needed for voice messages.");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current) return;

    const mediaRecorder = mediaRecorderRef.current;
    clearInterval(recordTimerRef.current);

    mediaRecorder.onstop = async () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      const voiceBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorder.mimeType || "audio/webm",
      });

      try {
        setIsUploadingVoice(true);
        toast.loading("Uploading voice memo...", { id: "voice-toast" });
        const voiceUrl = await uploadVoiceNote(voiceBlob);
        toast.dismiss("voice-toast");

        const tempId = `temp-${Date.now()}`;
        sendMessageMutation.mutate({
          voiceUrl,
          replyTo: replyingTo?._id,
          tempId,
        });
      } catch {
        toast.dismiss("voice-toast");
        toast.error("Failed to upload voice memo.");
      } finally {
        setIsUploadingVoice(false);
        setIsRecording(false);
        setRecordingSeconds(0);
      }
    };

    mediaRecorder.stop();
  };

  // Toggle Reaction Mutation
  const reactionMutation = useMutation({
    mutationFn: (vars: { messageId: string; emoji: string }) =>
      apiFetch(`/messages/${vars.messageId}/react`, {
        method: "POST",
        body: JSON.stringify({ emoji: vars.emoji }),
      }),
    onMutate: async ({ messageId, emoji }) => {
      setActiveReactionId(null);
      await queryClient.cancelQueries({ queryKey: ["messages"] });

      queryClient.setQueryData<MessageItem[]>(["messages"], (old = []) =>
        old.map((m) => {
          if (m._id !== messageId) return m;
          const exists = m.reactions.some(
            (r) => r.userId === currentUser?.id && r.emoji === emoji
          );
          const newReactions = exists
            ? m.reactions.filter(
                (r) => !(r.userId === currentUser?.id && r.emoji === emoji)
              )
            : [...m.reactions, { userId: currentUser?.id || "", emoji }];
          return { ...m, reactions: newReactions };
        })
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<MessageItem[]>(["messages"], (old = []) =>
        old.map((m) => (m._id === updated._id ? updated : m))
      );
    },
  });

  // Delete Message Mutation
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiFetch(`/messages/${messageId}`, { method: "DELETE" }),
    onSuccess: (_data, messageId) => {
      queryClient.setQueryData<MessageItem[]>(["messages"], (old = []) =>
        old.filter((m) => m._id !== messageId)
      );
      toast.success("Message deleted");
    },
  });

  // Load older messages when scrolling to top
  const handleLoadOlder = async () => {
    if (messages.length === 0 || isLoadingOlder || !hasMoreOlder) return;

    try {
      setIsLoadingOlder(true);
      const oldestMsg = messages[0];
      const older = await apiFetch<MessageItem[]>(
        `/messages?before=${oldestMsg.createdAt}&limit=50`
      );

      if (older.length === 0) {
        setHasMoreOlder(false);
        toast.info("Beginning of chat history reached.");
        return;
      }

      queryClient.setQueryData<MessageItem[]>(["messages"], (prev = []) => {
        const sortedOlder = [...older].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return [...sortedOlder, ...prev];
      });
    } catch {
      toast.error("Failed to load older messages.");
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Group messages by Day
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: MessageItem[] }[] = [];
    let currentLabel = "";
    let currentGroup: MessageItem[] = [];

    for (const msg of messages) {
      const msgDate = parseISO(msg.createdAt);
      let label = format(msgDate, "MMMM d, yyyy");
      if (isToday(msgDate)) label = "Today";
      else if (isYesterday(msgDate)) label = "Yesterday";

      if (label !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentLabel, items: currentGroup });
        }
        currentLabel = label;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentLabel, items: currentGroup });
    }

    return groups;
  }, [messages]);

  const formatRecSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] relative pb-1 sm:pb-2">
      {/* 1. Header Status Bar */}
      <div className="shrink-0 rounded-2xl border border-border/70 bg-card/90 p-3 mb-2 backdrop-blur-md flex items-center justify-between shadow-panel">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-xs font-bold text-white shadow-xs">
              {partnerName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {partnerName} &amp; You
            </h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Private Encrypted Sanctuary
            </p>
          </div>
        </div>
        <span className="text-sm rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-accent font-semibold flex items-center gap-1 shadow-xs">
          <Heart className="h-3 w-3 fill-accent/30" />
          <span>Connected</span>
        </span>
      </div>

      {/* 2. Pinned "Thinking of You" Ping Bar */}
      {latestPing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 mb-2 flex items-center justify-between rounded-xl border border-rose-400/40 bg-gradient-to-r from-rose-500/15 via-card to-accent/10 px-3 py-2 text-xs backdrop-blur-sm shadow-panel"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
              <Heart className="h-3.5 w-3.5 fill-rose-400" />
            </span>
            <div className="truncate">
              <span className="font-bold text-foreground mr-1.5">
                {latestPing.fromId === currentUser?.id ? "You" : partnerName}:
              </span>
              <span className="font-serif italic text-muted-foreground">
                "{latestPing.body}"
              </span>
            </div>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground ml-2">
            {format(parseISO(latestPing.createdAt), "h:mm a")}
          </span>
        </motion.div>
      )}

      {/* 3. Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-1 space-y-4 scroll-smooth"
      >
        {/* Load Older Messages Trigger */}
        {hasMoreOlder && messages.length >= 20 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              disabled={isLoadingOlder}
              onClick={handleLoadOlder}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-50 transition-all shadow-xs"
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span>Loading whispers...</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 rotate-180" />
                  <span>Load older whispers</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoadingMessages && (
          <div className="space-y-3 py-4">
            <div className="h-14 w-3/4 rounded-2xl bg-white/5 animate-pulse" />
            <div className="h-14 w-2/3 ml-auto rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-20 w-3/4 rounded-2xl bg-white/5 animate-pulse" />
          </div>
        )}

        {/* Empty State */}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="font-display text-base font-bold text-foreground">
              Your Private Thread
            </h4>
            <p className="mt-1 font-serif italic text-xs text-muted-foreground max-w-xs">
              Every whisper here is just for the two of you. Send the first love message to{" "}
              {partnerName}.
            </p>
          </div>
        )}

        {/* Grouped Messages Feed */}
        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-3">
            {/* Day Divider */}
            <div className="flex items-center justify-center my-3">
              <span className="rounded-full border border-border/60 bg-card/90 px-3 py-0.5 font-display text-[11px] font-semibold text-muted-foreground shadow-xs">
                {group.dateLabel}
              </span>
            </div>

            {/* Messages in Group */}
            {group.items.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const hasMedia = Boolean(msg.mediaUrl);
              const hasVoice = Boolean(msg.voiceUrl);

              return (
                <div
                  key={msg._id}
                  className={`group relative flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {/* Swipe-to-Reply or Trigger Bar */}
                  <div className="relative max-w-[85%] sm:max-w-[75%]">
                    {/* Quoted Reply Preview */}
                    {msg.replyTo && (
                      <div
                        className={`mb-1 flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] border ${
                          isMe
                            ? "bg-black/10 border-black/15 text-foreground/80"
                            : "bg-muted/60 border-border/60 text-muted-foreground"
                        }`}
                      >
                        <Reply className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {typeof msg.replyTo === "object"
                            ? msg.replyTo.body || "Voice or Media"
                            : "Replied message"}
                        </span>
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveReactionId(activeReactionId === msg._id ? null : msg._id);
                      }}
                      className={`relative rounded-3xl p-3 shadow-panel transition-all ${
                        isMe
                          ? "bg-gradient-to-br from-[#E5A962] to-[#E07A5F] text-foreground font-medium rounded-br-sm shadow-sm"
                          : "border border-border/70 bg-card text-foreground rounded-bl-sm"
                      }`}
                    >
                      {/* Image Message */}
                      {hasMedia && (
                        <div className="mb-2 overflow-hidden rounded-2xl border border-black/10">
                          <img
                            src={msg.mediaUrl}
                            alt="Sent media"
                            className="max-h-64 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Voice Note Message */}
                      {hasVoice && (
                        <VoiceNotePlayer voiceUrl={msg.voiceUrl!} isMe={isMe} />
                      )}

                      {/* Text Message */}
                      {msg.body && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.body}
                        </p>
                      )}

                      {/* Bottom Info: Time & Seen Status */}
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] font-mono ${
                          isMe ? "justify-end text-foreground/75" : "justify-end text-muted-foreground"
                        }`}
                      >
                        <span>{format(parseISO(msg.createdAt), "h:mm a")}</span>
                        {isMe && (
                          <span>
                            {msg.status === "sending" ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : msg.seenAt ? (
                              <CheckCheck
                                title="Seen by partner"
                                className="h-3.5 w-3.5 text-foreground font-bold"
                              />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reactions Pill Display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div
                          className={`absolute -bottom-2.5 flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-0.5 text-xs shadow-panel ${
                            isMe ? "right-2" : "left-2"
                          }`}
                        >
                          {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map(
                            (emoji) => {
                              const count = msg.reactions.filter(
                                (r) => r.emoji === emoji
                              ).length;
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() =>
                                    reactionMutation.mutate({
                                      messageId: msg._id,
                                      emoji,
                                    })
                                  }
                                  className="flex items-center gap-0.5 hover:scale-110 active:scale-95 transition-transform"
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && (
                                    <span className="text-[9px] font-mono text-muted-foreground">
                                      {count}
                                    </span>
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Floating Bar (Reply & React Trigger) */}
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 ${
                        isMe ? "left-0 -translate-x-full pr-1.5" : "right-0 translate-x-full pl-1.5"
                      } flex items-center gap-1`}
                    >
                      <button
                        type="button"
                        title="React"
                        onClick={() =>
                          setActiveReactionId(
                            activeReactionId === msg._id ? null : msg._id
                          )
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:text-accent shadow-xs"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Reply"
                        onClick={() => setReplyingTo(msg)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:text-accent shadow-xs"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          title="Delete message"
                          onClick={() => deleteMutation.mutate(msg._id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:text-rose-500 shadow-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Emoji Reaction Drawer Modal */}
                    <AnimatePresence>
                      {activeReactionId === msg._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -4 }}
                          className={`absolute z-30 -top-10 ${
                            isMe ? "right-0" : "left-0"
                          } flex items-center gap-1 rounded-full border border-border/70 bg-card/95 p-1 shadow-panel backdrop-blur-xl`}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                reactionMutation.mutate({
                                  messageId: msg._id,
                                  emoji,
                                })
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted active:scale-125 transition-transform text-sm"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 4. Typing Indicator */}
        <AnimatePresence>
          {partnerTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-2 py-1"
            >
              <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-xs text-foreground shadow-panel">
                <span className="font-serif italic text-accent">{partnerName} is typing</span>
                <span className="flex items-center gap-1 pl-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Reply Preview Banner */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="shrink-0 mb-1 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-foreground backdrop-blur-md shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Reply className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="font-bold text-accent">
                Replying to{" "}
                {replyingTo.senderId === currentUser?.id ? "yourself" : partnerName}:
              </span>
              <span className="truncate italic text-muted-foreground">
                {replyingTo.body || "Media / Voice note"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Composer Bar (Safe-Area aware & Sticky) */}
      <div className="shrink-0 rounded-3xl border border-border/70 bg-card/95 p-2 shadow-panel backdrop-blur-xl">
        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {isRecording ? (
          /* Voice Recording Mode */
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-xs font-bold text-rose-600">
                Recording Voice Note · {formatRecSec(recordingSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploadingVoice}
                onClick={stopAndSendRecording}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-1.5 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
              >
                {isUploadingVoice ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5 fill-white" />
                )}
                <span>Send Memo</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Mode */
          <div className="flex items-center gap-1.5">
            {/* Image attachment button */}
            <button
              type="button"
              disabled={isUploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all disabled:opacity-50"
            >
              {isUploadingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </button>

            {/* Quick Heart Ping Action */}
            <button
              type="button"
              onClick={() => {
                const tempId = `temp-${Date.now()}`;
                sendMessageMutation.mutate({
                  body: "Thinking of you ❤️",
                  replyTo: replyingTo?._id,
                  tempId,
                });
              }}
              title="Send quick heart"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
            >
              <Heart className="h-4 w-4 fill-rose-500" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder={`Whisper to ${partnerName}...`}
              className="min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />

            {/* Mic / Voice Note Toggle */}
            <button
              type="button"
              onClick={startRecording}
              title="Record voice memo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent hover:bg-accent/10 active:scale-95 transition-all"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendText}
              disabled={!text.trim() || sendMessageMutation.isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#E5A962] to-[#E07A5F] text-white shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:scale-100"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
