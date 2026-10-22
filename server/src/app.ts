import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./logger.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { mediaRouter } from "./routes/media.js";
import { cyclesRouter } from "./routes/cycles.js";
import { thoughtsRouter } from "./routes/thoughts.js";
import { progressRouter } from "./routes/progress.js";
import { messagesRouter } from "./routes/messages.js";
import { moodsRouter } from "./routes/moods.js";
import { notesRouter } from "./routes/notes.js";
import { coupleRouter } from "./routes/couple.js";
import { goalsRouter } from "./routes/goals.js";
import { meRouter } from "./routes/me.js";
import { pushRouter } from "./routes/push.js";
import { jobsRouter } from "./routes/jobs.js";
import { eventsRouter } from "./routes/events.js";
import { gratitudeRouter } from "./routes/gratitude.js";
import { conversationsRouter } from "./routes/conversations.js";
import { checkinsRouter } from "./routes/checkins.js";
import { surprisesRouter } from "./routes/surprises.js";
import { datesRouter } from "./routes/dates.js";
import { NotFoundError } from "./utils/errors.js";

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS: Allow only frontend origin with credentials enabled
  const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps or curl) in development/test
        if (!origin && env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        if (
          !origin ||
          allowedOrigins.includes("*") ||
          allowedOrigins.includes(origin) ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.startsWith("http://192.168.") ||
          origin.endsWith(".lovable.app") ||
          origin.endsWith(".lovableproject.com") ||
          origin.endsWith(".vercel.app") ||
          origin.includes("loca.lt") ||
          origin.includes("ngrok") ||
          origin.includes("trycloudflare.com")
        ) {
          return callback(null, true);
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Jobs-Secret", "X-Cron-Secret", "Bypass-Tunnel-Reminder"],
    })
  );

  // Request logging with pino-http
  if (env.NODE_ENV !== "test") {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === "/health" || req.url === "/api/health",
        },
      })
    );
  }

  // Rate limiting (applies to all non-test requests)
  app.use(generalLimiter);

  // Body and cookie parsing
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));
  app.use(cookieParser());

  // Root health and service endpoints
  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", service: "our-space-backend", version: "1.0.0" });
  });
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/media", mediaRouter);
  app.use("/voice", mediaRouter);
  app.use("/cycles", cyclesRouter);
  app.use("/thoughts", thoughtsRouter);
  app.use("/progress", progressRouter);
  app.use("/messages", messagesRouter);
  app.use("/moods", moodsRouter);
  app.use("/notes", notesRouter);
  app.use("/couple", coupleRouter);
  app.use("/goals", goalsRouter);
  app.use("/me", meRouter);
  app.use("/push", pushRouter);
  app.use("/jobs", jobsRouter);
  app.use("/events", eventsRouter);
  app.use("/gratitude", gratitudeRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/checkins", checkinsRouter);
  app.use("/surprises", surprisesRouter);
  app.use("/dates", datesRouter);

  // API router namespace
  app.use("/api", apiRouter);

  // Fallback 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError("API endpoint not found."));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
