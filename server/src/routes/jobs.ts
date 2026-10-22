import { Router, Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { CronService } from "../services/cronService.js";
import { UnauthorizedError } from "../utils/errors.js";

export const jobsRouter = Router();

/**
 * GET /jobs/tick
 * Protected by secret header (X-Jobs-Secret or Bearer token).
 * Wakes up Render service if sleeping and executes all due idempotent jobs.
 */
jobsRouter.get("/tick", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secretHeader =
      (req.headers["x-jobs-secret"] as string) ||
      (req.headers["x-cron-secret"] as string) ||
      "";

    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const providedSecret = secretHeader || bearerToken;
    const expectedSecret = env.JOBS_SECRET_KEY || "our_space_cron_secret_tick_2026";

    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedError("Unauthorized: Invalid or missing jobs secret key.");
    }

    const results = await CronService.runAllDueJobs();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Scheduled jobs tick completed successfully.",
      results,
    });
  } catch (error) {
    next(error);
  }
});
