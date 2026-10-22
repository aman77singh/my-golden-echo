import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Gratitude } from "../models/Gratitude.js";
import { emitToCouple } from "../socket.js";
import { sendToPartner } from "../services/pushService.js";
import { NotFoundError } from "../utils/errors.js";

export const gratitudeRouter = Router();

gratitudeRouter.use(requireAuth);

/**
 * GET /gratitude
 * List all entries in couple's gratitude jar
 */
gratitudeRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const entries = await Gratitude.find({ coupleId })
      .sort({ createdAt: -1 })
      .populate("userId", "name role avatarUrl");

    res.status(200).json(entries);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /gratitude/random
 * Pull a random gratitude slip from the jar
 */
gratitudeRouter.get("/random", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const count = await Gratitude.countDocuments({ coupleId });
    if (count === 0) {
      return res.status(200).json({ empty: true, message: "The gratitude jar is waiting for your first slip!" });
    }

    const randomOffset = Math.floor(Math.random() * count);
    const slip = await Gratitude.findOne({ coupleId })
      .skip(randomOffset)
      .populate("userId", "name role avatarUrl");

    res.status(200).json(slip);
  } catch (error) {
    next(error);
  }
});

const createGratitudeSchema = z.object({
  body: z.string().min(1, "Gratitude message is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /gratitude
 * Drop a new note into the gratitude jar
 */
gratitudeRouter.post(
  "/",
  validateBody(createGratitudeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const todayStr = req.body.date || new Date().toISOString().split("T")[0];

      const slip = await Gratitude.create({
        coupleId: new Types.ObjectId(req.user!.coupleId),
        userId: new Types.ObjectId(req.user!.id),
        body: req.body.body,
        date: todayStr,
      });

      emitToCouple(req.user!.coupleId, "gratitude:new", slip);

      // Send gentle push to partner
      sendToPartner(req.user!.id, {
        title: "A Little Gratitude Dropped In ✨",
        body: `${req.user!.name} added a sweet note to your Gratitude Jar.`,
        category: "messages",
        url: "/app/more/gratitude",
      }).catch(() => {});

      res.status(201).json(slip);
    } catch (error) {
      next(error);
    }
  }
);
