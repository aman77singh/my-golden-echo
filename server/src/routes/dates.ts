import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { DateIdea } from "../models/DateIdea.js";
import { emitToCouple } from "../socket.js";
import { sendToPartner } from "../services/pushService.js";
import { NotFoundError } from "../utils/errors.js";

export const datesRouter = Router();

datesRouter.use(requireAuth);

/**
 * GET /dates
 * List date ideas in the jar
 */
datesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const ideas = await DateIdea.find({ coupleId })
      .sort({ createdAt: -1 })
      .populate("suggestedById", "name role avatarUrl");

    res.status(200).json(ideas);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dates/random
 * Pick one date idea at random from uncompleted ideas (or all if all completed)
 */
datesRouter.get("/random", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);

    // Prefer uncompleted ideas first
    let count = await DateIdea.countDocuments({ coupleId, completed: false });
    let uncompletedOnly = true;

    if (count === 0) {
      count = await DateIdea.countDocuments({ coupleId });
      uncompletedOnly = false;
    }

    if (count === 0) {
      return res.status(200).json({ empty: true, message: "Your Date Jar is empty! Add a few fun ideas together." });
    }

    const randomOffset = Math.floor(Math.random() * count);
    const filter: any = { coupleId };
    if (uncompletedOnly) filter.completed = false;

    const chosen = await DateIdea.findOne(filter)
      .skip(randomOffset)
      .populate("suggestedById", "name role avatarUrl");

    if (chosen) {
      chosen.pulledCount = (chosen.pulledCount || 0) + 1;
      await chosen.save();
    }

    res.status(200).json(chosen);
  } catch (error) {
    next(error);
  }
});

const createDateIdeaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["indoor", "outdoor", "food", "adventure", "chill"]).optional().default("chill"),
  vibe: z.string().optional(),
  estimatedCost: z.enum(["free", "$", "$$", "$$$"]).optional().default("$"),
});

/**
 * POST /dates
 * Add date idea to jar
 */
datesRouter.post(
  "/",
  validateBody(createDateIdeaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idea = await DateIdea.create({
        coupleId: new Types.ObjectId(req.user!.coupleId),
        suggestedById: new Types.ObjectId(req.user!.id),
        title: req.body.title,
        category: req.body.category,
        vibe: req.body.vibe,
        estimatedCost: req.body.estimatedCost,
      });

      emitToCouple(req.user!.coupleId, "date:new", {
        ...idea.toObject(),
        actorId: req.user!.id,
        actorName: req.user!.name,
      });

      sendToPartner(req.user!.id, {
        title: "New Date Idea in the Jar! 🍷",
        body: `${req.user!.name} added: "${idea.title}"`,
        category: "messages",
        url: "/app/more/datejar",
      }).catch(() => {});

      res.status(201).json(idea);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /dates/:id/complete
 * Toggle completed state
 */
datesRouter.patch("/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idea = await DateIdea.findOne({
      _id: new Types.ObjectId(req.params.id),
      coupleId: new Types.ObjectId(req.user!.coupleId),
    });

    if (!idea) throw new NotFoundError("Date idea not found.");

    idea.completed = !idea.completed;
    await idea.save();

    emitToCouple(req.user!.coupleId, "date:update", {
      ...idea.toObject(),
      actorId: req.user!.id,
      actorName: req.user!.name,
    });

    res.status(200).json(idea);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /dates/:id
 */
datesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idea = await DateIdea.findOne({
      _id: new Types.ObjectId(req.params.id),
      coupleId: new Types.ObjectId(req.user!.coupleId),
    });

    if (!idea) throw new NotFoundError("Date idea not found.");

    await idea.deleteOne();
    emitToCouple(req.user!.coupleId, "date:delete", {
      actorId: req.user!.id,
      actorName: req.user!.name,
    });
    res.status(200).json({ message: "Date idea removed." });
  } catch (error) {
    next(error);
  }
});
