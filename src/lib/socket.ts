import { io, Socket } from "socket.io-client";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiBaseUrl, getStoredToken, getStoredUser, refreshToken } from "./api";

let socket: Socket | null = null;
let registeredQueryClient: QueryClient | null = null;

function isPartnerActivity(actorId: unknown): boolean {
  const currentUserId = getStoredUser()?.id;
  if (!actorId || !currentUserId) return false;
  const normalizedActorId =
    typeof actorId === "string"
      ? actorId
      : typeof actorId === "object" && actorId !== null && "_id" in actorId
        ? String((actorId as { _id: unknown })._id)
        : String(actorId);
  return normalizedActorId !== currentUserId;
}

function notifyPartnerActivity(actorId: unknown, title: string, description?: string) {
  if (isPartnerActivity(actorId)) {
    toast(title, { description });
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(queryClient: QueryClient): Socket | null {
  if (typeof window === "undefined") return null;

  registeredQueryClient = queryClient;
  const token = getStoredToken();
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // Disconnect previous if any
  if (socket) {
    socket.disconnect();
  }

  const baseUrl = getApiBaseUrl();
  const extraHeaders: Record<string, string> = {};
  if (baseUrl.includes("loca.lt")) {
    extraHeaders["Bypass-Tunnel-Reminder"] = "true";
  }

  socket = io(baseUrl, {
    auth: (cb) => {
      cb({ token: getStoredToken() });
    },
    extraHeaders,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("🌟 Connected to Our Space real-time gateway:", socket?.id);
    queryClient.invalidateQueries({ queryKey: ["moods"] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["messages"] });
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
  });

  socket.on("disconnect", (reason) => {
    console.log("Real-time gateway disconnected:", reason);
  });

  socket.on("connect_error", async (error) => {
    console.warn("Socket connection error:", error.message);
    const msg = error.message?.toLowerCase() || "";
    if (
      msg.includes("jwt") ||
      msg.includes("auth") ||
      msg.includes("unauthorized") ||
      msg.includes("token")
    ) {
      const refreshed = await refreshToken();
      if (refreshed && socket) {
        socket.connect();
      }
    }
  });

  // 1. Real-time Mood Update (instant 0ms cache update)
  socket.on("mood:update", (data: { mood: any; userId: string; userName?: string }) => {
    console.log("Real-time mood update received:", data);

    const currentStoredUser = getStoredUser();
    const isMine = data.userId === currentStoredUser?.id;

    queryClient.setQueryData<any>(["moods", "latest"], (prev: any) => {
      if (!prev) {
        return {
          mine: isMine ? data.mood : null,
          partner: !isMine ? data.mood : null,
          partnerName: data.userName || "Partner",
        };
      }
      return {
        ...prev,
        mine: isMine ? data.mood : prev.mine,
        partner: !isMine ? data.mood : prev.partner,
        partnerName: !isMine && data.userName ? data.userName : prev.partnerName,
      };
    });

    // Invalidate mood queries in background to ensure full sync
    queryClient.invalidateQueries({ queryKey: ["moods"] });

    if (data.userName && !isMine) {
      notifyPartnerActivity(data.userId, `${data.userName} updated their vibe: ${data.mood.emoji}`);
    }
  });

  // 2. Real-time Love Note or Thinking of You Ping
  socket.on("note:new", (data: { note: any; senderId?: string; senderName?: string }) => {
    console.log("Real-time note received:", data);
    queryClient.invalidateQueries({ queryKey: ["notes"] });

    if (!isPartnerActivity(data.senderId)) return;
    if (data.note.kind === "ping") {
      toast("Thinking of you! ❤️", {
        description: `${data.senderName || "Your partner"} just sent you love.`,
        icon: "✨",
      });
    } else {
      toast("New Love Note 💌", {
        description: `${data.senderName || "Your partner"} left you a note.`,
      });
    }
  });

  // 3. Real-time Progress Updates
  socket.on("progress:update", () => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
  });

  socket.on("profile:update", () => {
    queryClient.invalidateQueries({ queryKey: ["couple"] });
    queryClient.invalidateQueries({ queryKey: ["myProfile"] });
  });

  socket.on("progress:new", (post: any) => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    if (post?.body && isPartnerActivity(post.userId)) {
      toast("New Progress Shared! 🔥", {
        description: `${post.category}: ${post.body.slice(0, 45)}...`,
      });
    }
  });

  socket.on("progress:reply", ({ reply }: any) => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    notifyPartnerActivity(
      reply?.userId,
      "New Cheer on Progress! 👏",
      reply?.quickCheer || reply?.body || "Sent a cheer!",
    );
  });

  socket.on("progress:reaction", ({ postId, reactions, actorId }: any) => {
    queryClient.setQueryData<any[]>(["progress"], (old) => {
      if (!old) return old;
      return old.map((p) => (p._id === postId ? { ...p, reactions } : p));
    });
    notifyPartnerActivity(
      actorId,
      "Progress reaction 🔥",
      "Your partner reacted to a progress update.",
    );
  });

  // 4. Real-time Chat Messages
  socket.on("message:new", (newMsg: any) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return [newMsg];
      const existingIndex = old.findIndex((message) => message._id === newMsg._id);
      if (existingIndex >= 0) {
        return old.flatMap((message, index) =>
          message._id !== newMsg._id ? [message] : index === existingIndex ? [newMsg] : [],
        );
      }
      return [...old, newMsg];
    });
    notifyPartnerActivity(
      newMsg?.senderId,
      "New message 💬",
      newMsg?.body || (newMsg?.voiceUrl ? "Sent a voice message" : "Sent a photo"),
    );
  });

  socket.on("message:seen", ({ seenAt }: { seenAt: string }) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return old;
      return old.map((m) => (!m.seenAt ? { ...m, seenAt } : m));
    });
  });

  socket.on(
    "message:reaction",
    ({
      messageId,
      reactions,
      actorId,
    }: {
      messageId: string;
      reactions: any[];
      actorId?: string;
    }) => {
      queryClient.setQueryData<any[]>(["messages"], (old) => {
        if (!old) return old;
        return old.map((m) => (m._id === messageId ? { ...m, reactions } : m));
      });
      notifyPartnerActivity(actorId, "Message reaction ❤️", "Your partner reacted to a message.");
    },
  );

  socket.on("message:delete", ({ messageId }: { messageId: string }) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return old;
      return old.filter((m) => m._id !== messageId);
    });
  });

  // 5. Typing status event dispatch
  socket.on("typing", (data: { userId: string; userName?: string; isTyping: boolean }) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ourspace:typing", { detail: data }));
    }
  });

  // 6. Real-time Thoughts & Insecurities
  socket.on("thought:new", (thought: any) => {
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    if (!isPartnerActivity(thought?.userId)) return;
    if (thought?.kind === "insecurity") {
      toast("Partner shared a vulnerability 🤍", {
        description: "A tender space to listen without needing to fix.",
      });
    } else {
      toast("New Thought Shared ✨", {
        description: thought?.body?.slice(0, 50) + "...",
      });
    }
  });

  socket.on("thought:response", ({ actorId }: { actorId?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    notifyPartnerActivity(actorId, "Partner responded with gentle care 🤍");
  });

  socket.on("insecurity:nudge", (data: { message?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    toast("Gentle Nudge 🤍", {
      description: data?.message || "Check in with her about what she shared.",
      duration: 6000,
    });
  });

  socket.on("privacy:update", () => {
    queryClient.invalidateQueries({ queryKey: ["couple"] });
    queryClient.invalidateQueries({ queryKey: ["cycles"] });
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
  });

  socket.on("cycle:activity", (data: { actorId?: string; actorName?: string; action?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["cycles"] });
    if (!isPartnerActivity(data?.actorId)) return;
    const actionText =
      data.action === "created"
        ? "updated cycle information"
        : data.action === "symptoms"
          ? "updated cycle notes"
          : "updated cycle information";
    toast("Cycle update 🌸", {
      description: `${data.actorName || "Your partner"} ${actionText}.`,
    });
  });

  socket.on("date:new", (data: { actorId?: string; actorName?: string; title?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
    notifyPartnerActivity(
      data.actorId,
      "New date idea 🍷",
      `${data.actorName || "Your partner"} added ${data.title || "an idea"}.`,
    );
  });

  socket.on("date:update", (data: { actorId?: string; actorName?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
    notifyPartnerActivity(
      data.actorId,
      "Date idea updated ✨",
      `${data.actorName || "Your partner"} updated the Date Jar.`,
    );
  });

  socket.on("event:new", (data: { actorId?: string; actorName?: string; title?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    notifyPartnerActivity(
      data.actorId,
      "Calendar event added 📅",
      `${data.actorName || "Your partner"} added ${data.title || "an event"}.`,
    );
  });

  socket.on("event:update", (data: { actorId?: string; actorName?: string; title?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    notifyPartnerActivity(
      data.actorId,
      "Calendar event updated 📅",
      `${data.actorName || "Your partner"} updated ${data.title || "an event"}.`,
    );
  });

  socket.on("event:delete", (data: { actorId?: string; actorName?: string; title?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    notifyPartnerActivity(
      data.actorId,
      "Calendar event removed 📅",
      `${data.actorName || "Your partner"} removed ${data.title || "an event"}.`,
    );
  });

  socket.on("date:delete", (data: { actorId?: string; actorName?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["dateIdeas"] });
    notifyPartnerActivity(
      data.actorId,
      "Date idea removed 🍷",
      `${data.actorName || "Your partner"} removed an idea.`,
    );
  });

  socket.on("gratitude:new", (data: { userId?: string; body?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["gratitudeSlips"] });
    notifyPartnerActivity(data.userId, "A little gratitude shared ✨", data.body);
  });

  socket.on("checkin:new", (data: { userId?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["weeklyCheckins"] });
    notifyPartnerActivity(
      data.userId,
      "Weekly check-in shared 💛",
      "Your partner completed their weekly reflection.",
    );
  });

  socket.on("conversation:answered", (data: { answeredBy?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["conversationToday"] });
    notifyPartnerActivity(
      data.answeredBy,
      "Daily question answered 💌",
      "Your partner shared their answer.",
    );
  });

  socket.on("conversation:revealed", (data: { actorId?: string }) => {
    queryClient.invalidateQueries({ queryKey: ["conversationToday"] });
    notifyPartnerActivity(
      data.actorId,
      "Today's answers are ready ✨",
      "You can read each other's responses.",
    );
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

if (typeof window !== "undefined") {
  const handleForegroundOrOnline = () => {
    if (document.visibilityState === "visible" || navigator.onLine) {
      if (socket && !socket.connected) {
        socket.connect();
      }
      if (registeredQueryClient) {
        registeredQueryClient.invalidateQueries({ queryKey: ["moods"] });
        registeredQueryClient.invalidateQueries({ queryKey: ["notes"] });
        registeredQueryClient.invalidateQueries({ queryKey: ["progress"] });
        registeredQueryClient.invalidateQueries({ queryKey: ["messages"] });
        registeredQueryClient.invalidateQueries({ queryKey: ["thoughts"] });
      }
    }
  };

  window.addEventListener("visibilitychange", handleForegroundOrOnline);
  window.addEventListener("online", handleForegroundOrOnline);
}
