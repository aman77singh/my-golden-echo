import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { MoodService } from "../services/moodService.js";

export const moodsRouter = Router();

moodsRouter.use(requireAuth);

const createMoodSchema = z.object({
  emoji: z.string().min(1, "Emoji is required"),
  energy: z.number().int().min(1).max(5),
  note: z.string().max(140, "Note must be 140 characters or fewer").optional(),
});

const getMoodsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * POST /moods
 * Log mood and emit mood:update via Socket.IO
 */
moodsRouter.post(
  "/",
  validateBody(createMoodSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mood = await MoodService.logMood(req.user!, req.body);
      res.status(201).json(mood);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /moods/latest
 * Get latest mood for both partners in the couple
 */
moodsRouter.get(
  "/latest",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MoodService.getLatestMoods(req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /moods
 * Get moods history for couple with optional ?from&to range
 */
moodsRouter.get(
  "/",
  validateQuery(getMoodsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const moods = await MoodService.getMoodHistory(req.user!, from, to);
      res.status(200).json(moods);
    } catch (error) {
      next(error);
    }
  }
);
