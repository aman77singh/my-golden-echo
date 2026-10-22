import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { GoalService } from "../services/goalService.js";

export const goalsRouter = Router();

goalsRouter.use(requireAuth);

const createGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  category: z.string().min(1, "Category is required"),
  targetCount: z.number().positive().optional(),
  currentCount: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  deadline: z.string().optional(),
});

const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(["active", "completed", "paused", "abandoned"]).optional(),
});

const idParamSchema = z.object({
  id: z.string(),
});

/**
 * GET /goals
 */
goalsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await GoalService.getGoals(req.user!);
    res.status(200).json(goals);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /goals
 */
goalsRouter.post(
  "/",
  validateBody(createGoalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await GoalService.createGoal(req.user!, req.body);
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /goals/:id
 */
goalsRouter.get(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await GoalService.getGoal(req.user!, req.params.id);
      res.status(200).json(goal);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /goals/:id & PUT /goals/:id
 */
const handleUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goal = await GoalService.updateGoal(req.user!, req.params.id, req.body);
    res.status(200).json(goal);
  } catch (error) {
    next(error);
  }
};

goalsRouter.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateGoalSchema),
  handleUpdate
);

goalsRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateGoalSchema),
  handleUpdate
);

/**
 * DELETE /goals/:id
 */
goalsRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await GoalService.deleteGoal(req.user!, req.params.id);
      res.status(200).json({ message: "Goal deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);
