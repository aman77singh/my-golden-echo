import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Surprise } from "../models/Surprise.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

export const surprisesRouter = Router();

surprisesRouter.use(requireAuth);

/**
 * GET /surprises
 * Visible to the CREATOR ONLY. Partner CANNOT see items.
 */
surprisesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const surprises = await Surprise.find({
      coupleId: new Types.ObjectId(req.user!.coupleId),
      creatorId: new Types.ObjectId(req.user!.id),
    }).sort({ createdAt: -1 });

    res.status(200).json(surprises);
  } catch (error) {
    next(error);
  }
});

const createSurpriseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  targetDate: z.string().or(z.date()).optional(),
  budget: z.string().optional(),
});

/**
 * POST /surprises
 * Hidden from partner; does not notify or broadcast.
 */
surprisesRouter.post(
  "/",
  validateBody(createSurpriseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const surprise = await Surprise.create({
        coupleId: new Types.ObjectId(req.user!.coupleId),
        creatorId: new Types.ObjectId(req.user!.id),
        title: req.body.title,
        notes: req.body.notes,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined,
        budget: req.body.budget,
        completed: false,
      });

      res.status(201).json(surprise);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /surprises/:id
 */
surprisesRouter.patch(
  "/:id",
  validateBody(
    createSurpriseSchema.extend({
      completed: z.boolean().optional(),
    }).partial()
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const surprise = await Surprise.findOne({
        _id: new Types.ObjectId(req.params.id),
        coupleId: new Types.ObjectId(req.user!.coupleId),
      });

      if (!surprise) throw new NotFoundError("Surprise not found.");

      if (surprise.creatorId.toString() !== req.user!.id) {
        throw new ForbiddenError("Surprises are strictly private to their creator.");
      }

      if (req.body.title !== undefined) surprise.title = req.body.title;
      if (req.body.notes !== undefined) surprise.notes = req.body.notes;
      if (req.body.targetDate !== undefined) {
        surprise.targetDate = req.body.targetDate ? new Date(req.body.targetDate) : undefined;
      }
      if (req.body.budget !== undefined) surprise.budget = req.body.budget;
      if (req.body.completed !== undefined) surprise.completed = req.body.completed;

      await surprise.save();
      res.status(200).json(surprise);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /surprises/:id
 */
surprisesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const surprise = await Surprise.findOne({
      _id: new Types.ObjectId(req.params.id),
      coupleId: new Types.ObjectId(req.user!.coupleId),
    });

    if (!surprise) throw new NotFoundError("Surprise not found.");

    if (surprise.creatorId.toString() !== req.user!.id) {
      throw new ForbiddenError("Surprises are strictly private to their creator.");
    }

    await surprise.deleteOne();
    res.status(200).json({ message: "Surprise deleted successfully." });
  } catch (error) {
    next(error);
  }
});
