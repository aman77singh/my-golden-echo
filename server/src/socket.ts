import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
import { logger } from "./logger.js";
import { AuthUser } from "./types/shared.js";

export interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
  coupleId?: string;
}

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(server: http.Server): SocketIOServer {
  const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim());

  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin && env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error("Socket.IO origin blocked by CORS"));
      },
      credentials: true,
    },
  });

  // JWT Authentication Middleware for Sockets
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null);

      if (!token) {
        return next(new Error("Authentication token required for Socket connection."));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        userId: string;
        coupleId: string;
      };

      const user = await User.findById(decoded.userId).lean();
      if (!user) {
        return next(new Error("User not found for Socket connection."));
      }

      socket.user = {
        id: user._id.toString(),
        coupleId: user.coupleId.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        shareCycle: user.shareCycle,
        avatarUrl: user.avatarUrl,
      };
      socket.coupleId = user.coupleId.toString();

      next();
    } catch (error) {
      logger.warn({ err: error }, "Socket authentication failed");
      next(new Error("Invalid authentication token."));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const coupleId = socket.coupleId;
    if (coupleId) {
      socket.join(coupleId);
      socket.join(`couple:${coupleId}`);
      logger.info(
        { socketId: socket.id, userId: socket.user?.id, coupleId },
        "Authenticated socket joined couple room"
      );
    }

    socket.on("typing", (data: { isTyping: boolean }) => {
      if (coupleId) {
        socket.to(coupleId).to(`couple:${coupleId}`).emit("typing", {
          userId: socket.user?.id,
          userName: socket.user?.name,
          isTyping: Boolean(data?.isTyping),
        });
      }
    });

    socket.on("typing:start", () => {
      if (coupleId) {
        socket.to(coupleId).to(`couple:${coupleId}`).emit("typing", {
          userId: socket.user?.id,
          userName: socket.user?.name,
          isTyping: true,
        });
      }
    });

    socket.on("typing:stop", () => {
      if (coupleId) {
        socket.to(coupleId).to(`couple:${coupleId}`).emit("typing", {
          userId: socket.user?.id,
          userName: socket.user?.name,
          isTyping: false,
        });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Socket client disconnected");
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitToCouple(coupleId: string, event: string, data: any): void {
  if (!ioInstance) {
    logger.debug({ event, coupleId }, "Socket.IO not initialized, skipping broadcast");
    return;
  }
  ioInstance.to(coupleId).to(`couple:${coupleId}`).emit(event, data);
  logger.info({ event, coupleId }, "Socket event emitted to couple room");
}
