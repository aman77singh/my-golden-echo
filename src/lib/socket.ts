import { io, Socket } from "socket.io-client";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL, getStoredToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(queryClient: QueryClient): Socket | null {
  if (typeof window === "undefined") return null;

  const token = getStoredToken();
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // Disconnect previous if any
  if (socket) {
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("🌟 Connected to Our Space real-time gateway:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Real-time gateway disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.warn("Socket connection error:", error.message);
  });

  // 1. Real-time Mood Update
  socket.on("mood:update", (data: { mood: any; userId: string; userName?: string }) => {
    console.log("Real-time mood update received:", data);

    // Invalidate mood queries in TanStack Query
    queryClient.invalidateQueries({ queryKey: ["moods"] });

    if (data.userName) {
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

  // 3. Real-time Progress Update
  socket.on("progress:update", () => {
    queryClient.invalidateQueries({ queryKey: ["progress"] });
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

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
