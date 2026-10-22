import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Event } from "../models/Event.js";
import { Cycle } from "../models/Cycle.js";
import { User } from "../models/User.js";
import { NotFoundError } from "../utils/errors.js";
import { emitToCouple } from "../socket.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

/**
 * GET /events
 * Returns couple calendar events.
 * If query.includeCycle=true, synthesizes cycle events if user is 'her' or partner's shareCycle is true.
 */
eventsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const events = await Event.find({ coupleId }).sort({ date: 1 });

    const resultEvents = events.map((e) => e.toObject());

    // Cycle events overlay
    if (req.query.includeCycle !== "false") {
      const woman = await User.findOne({
        coupleId,
        role: "her",
      });

      if (woman && (req.user!.role === "her" || woman.shareCycle)) {
        const cycles = await Cycle.find({ userId: woman._id }).sort({ startDate: -1 }).limit(6);
        if (cycles.length > 0) {
          const latest = cycles[0];
          const latestStart = new Date(latest.startDate);

          // Calculate average length
          let avgLength = 28;
          if (cycles.length >= 2) {
            const lengths: number[] = [];
            for (let i = 0; i < cycles.length - 1; i++) {
              const cur = new Date(cycles[i].startDate);
              const prev = new Date(cycles[i + 1].startDate);
              const diff = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
              if (diff >= 18 && diff <= 50) lengths.push(diff);
            }
            if (lengths.length) {
              avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
            }
          }

          const predictedStart = new Date(latestStart.getTime() + avgLength * 24 * 60 * 60 * 1000);
          const ovulationDate = new Date(predictedStart.getTime() - 14 * 24 * 60 * 60 * 1000);

          resultEvents.push({
            _id: `cycle-predicted-${predictedStart.toISOString()}`,
            coupleId: coupleId.toString(),
            title: `${woman.name}'s Predicted Period 🌸`,
            description: "Expected cycle start. Comfort tea and gentle care ready.",
            date: predictedStart,
            category: "cycle",
            isCountdown: true,
            isVirtual: true,
          } as any);

          resultEvents.push({
            _id: `cycle-ovulation-${ovulationDate.toISOString()}`,
            coupleId: coupleId.toString(),
            title: "Estimated Ovulation Window ✨",
            description: "Peak hormonal balance and ovulatory window.",
            date: ovulationDate,
            category: "cycle",
            isCountdown: false,
            isVirtual: true,
          } as any);
        }
      }
    }

    res.status(200).json(resultEvents);
  } catch (error) {
    next(error);
  }
});

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().or(z.date()),
  remindDaysBefore: z.number().min(0).max(30).optional().default(1),
  category: z.string().optional().default("custom"),
  isCountdown: z.boolean().optional().default(false),
});

/**
 * POST /events
 */
eventsRouter.post(
  "/",
  validateBody(createEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await Event.create({
        coupleId: new Types.ObjectId(req.user!.coupleId),
        title: req.body.title,
        description: req.body.description,
        date: new Date(req.body.date),
        remindDaysBefore: req.body.remindDaysBefore,
        category: req.body.category,
        isCountdown: req.body.isCountdown,
      });

      emitToCouple(req.user!.coupleId, "event:new", {
        ...event.toObject(),
        actorId: req.user!.id,
        actorName: req.user!.name,
      });

      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /events/:id
 */
eventsRouter.patch(
  "/:id",
  validateBody(createEventSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await Event.findOne({
        _id: new Types.ObjectId(req.params.id),
        coupleId: new Types.ObjectId(req.user!.coupleId),
      });

      if (!event) throw new NotFoundError("Event not found.");

      if (req.body.title !== undefined) event.title = req.body.title;
      if (req.body.description !== undefined) event.description = req.body.description;
      if (req.body.date !== undefined) event.date = new Date(req.body.date);
      if (req.body.remindDaysBefore !== undefined) event.remindDaysBefore = req.body.remindDaysBefore;
      if (req.body.category !== undefined) event.category = req.body.category;
      if (req.body.isCountdown !== undefined) event.isCountdown = req.body.isCountdown;

      await event.save();
      emitToCouple(req.user!.coupleId, "event:update", {
        ...event.toObject(),
        actorId: req.user!.id,
        actorName: req.user!.name,
      });
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /events/:id
 */
eventsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findOne({
      _id: new Types.ObjectId(req.params.id),
      coupleId: new Types.ObjectId(req.user!.coupleId),
    });

    if (!event) throw new NotFoundError("Event not found.");

    await event.deleteOne();
    emitToCouple(req.user!.coupleId, "event:delete", {
      actorId: req.user!.id,
      actorName: req.user!.name,
      title: event.title,
    });
    res.status(200).json({ message: "Event removed successfully." });
  } catch (error) {
    next(error);
  }
});
