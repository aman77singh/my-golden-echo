import { io, Socket } from "socket.io-client";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiBaseUrl, getStoredToken, getStoredUser, refreshToken } from "./api";

let socket: Socket | null = null;
let registeredQueryClient: QueryClient | null = null;

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
    if (msg.includes("jwt") || msg.includes("auth") || msg.includes("unauthorized") || msg.includes("token")) {
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
      toast.success(`${data.userName} updated their vibe: ${data.mood.emoji}`);
    }
  });

  // 2. Real-time Love Note or Thinking of You Ping
  socket.on("note:new", (data: { note: any; senderName?: string }) => {
    console.log("Real-time note received:", data);
    queryClient.invalidateQueries({ queryKey: ["notes"] });

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

  socket.on("progress:new", (post: any) => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    if (post?.body) {
      toast("New Progress Shared! 🔥", {
        description: `${post.category}: ${post.body.slice(0, 45)}...`,
      });
    }
  });

  socket.on("progress:reply", ({ reply }: any) => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    toast("New Cheer on Progress! 👏", {
      description: reply?.quickCheer || reply?.body || "Sent a cheer!",
      icon: "🎉",
    });
  });

  socket.on("progress:reaction", ({ postId, reactions }: any) => {
    queryClient.setQueryData<any[]>(["progress"], (old) => {
      if (!old) return old;
      return old.map((p) => (p._id === postId ? { ...p, reactions } : p));
    });
  });

  // 4. Real-time Chat Messages
  socket.on("message:new", (newMsg: any) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return [newMsg];
      // Avoid duplicate if already added optimistically
      const exists = old.some((m) => m._id === newMsg._id || (m.tempId && m.tempId === newMsg.tempId));
      if (exists) {
        return old.map((m) => (m._id === newMsg._id || m.tempId === newMsg.tempId ? newMsg : m));
      }
      return [...old, newMsg];
    });
  });

  socket.on("message:seen", ({ seenAt }: { seenAt: string }) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return old;
      return old.map((m) => (!m.seenAt ? { ...m, seenAt } : m));
    });
  });

  socket.on("message:reaction", ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
    queryClient.setQueryData<any[]>(["messages"], (old) => {
      if (!old) return old;
      return old.map((m) => (m._id === messageId ? { ...m, reactions } : m));
    });
  });

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

  socket.on("thought:response", () => {
    queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    toast("Partner responded with gentle care 🤍", {
      icon: "🫂",
    });
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

