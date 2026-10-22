import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { WeeklyCheckIn } from "../models/WeeklyCheckIn.js";
import { emitToCouple } from "../socket.js";
import { sendToPartner } from "../services/pushService.js";

export const checkinsRouter = Router();

checkinsRouter.use(requireAuth);

/**
 * GET /checkins
 * List weekly check-in entries for couple
 */
checkinsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const checkins = await WeeklyCheckIn.find({ coupleId })
      .sort({ createdAt: -1 })
      .populate("userId", "name role avatarUrl");

    res.status(200).json(checkins);
  } catch (error) {
    next(error);
  }
});

const createCheckInSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ratings: z.object({
    communication: z.number().min(1).max(5),
    intimacy: z.number().min(1).max(5),
    fun: z.number().min(1).max(5),
    support: z.number().min(1).max(5),
  }),
  highlight: z.string().optional(),
  oneThingToImprove: z.string().min(1, "Please share one thing to nurture or improve"),
});

/**
 * POST /checkins
 * Submit weekly check-in
 */
checkinsRouter.post(
  "/",
  validateBody(createCheckInSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupleId = new Types.ObjectId(req.user!.coupleId);
      const userId = new Types.ObjectId(req.user!.id);

      // Default weekStart to current Monday
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const defaultWeekStart = monday.toISOString().split("T")[0];

      const weekStart = req.body.weekStart || defaultWeekStart;

      const checkin = await WeeklyCheckIn.create({
        coupleId,
        userId,
        weekStart,
        ratings: req.body.ratings,
        highlight: req.body.highlight,
        oneThingToImprove: req.body.oneThingToImprove,
      });

      emitToCouple(req.user!.coupleId, "checkin:new", checkin);

      sendToPartner(req.user!.id, {
        title: "Weekly Check-in Shared 💛",
        body: `${req.user!.name} shared their weekly reflection and ratings.`,
        category: "progress",
        url: "/app/more/checkin",
      }).catch(() => {});

      res.status(201).json(checkin);
    } catch (error) {
      next(error);
    }
  }
);
