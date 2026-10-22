import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { ThoughtService } from "../services/thoughtService.js";

export const thoughtsRouter = Router();

thoughtsRouter.use(requireAuth);

const createThoughtSchema = z.object({
  body: z.string().min(1, "Thought body cannot be empty").max(2000),
  kind: z.enum(["thought", "insecurity"]),
  visibility: z.enum(["private", "shared"]).optional(),
  justVenting: z.boolean().optional(),
});

const updateThoughtSchema = z.object({
  body: z.string().min(1).max(2000).optional(),
  visibility: z.enum(["private", "shared"]).optional(),
  justVenting: z.boolean().optional(),
});

const responseSchema = z.object({
  emoji: z.string().optional(),
  note: z.string().max(200, "Insecurity response note must be 200 characters or fewer").optional(),
});

const idParamSchema = z.object({
  id: z.string(),
});

const getQuerySchema = z.object({
  kind: z.enum(["thought", "insecurity"]).optional(),
});

/**
 * POST /thoughts
 * Create thought or insecurity
 */
thoughtsRouter.post(
  "/",
  validateBody(createThoughtSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.createThought(req.user!, req.body);
      res.status(201).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /thoughts
 * List thoughts (partner's private thoughts are automatically filtered)
 */
thoughtsRouter.get(
  "/",
  validateQuery(getQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kind = req.query.kind as any;
      const thoughts = await ThoughtService.getThoughts(req.user!, { kind });
      res.status(200).json(thoughts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /thoughts/:id
 * Get single thought (author always, partner only if shared)
 */
thoughtsRouter.get(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.getThoughtById(req.user!, req.params.id);
      res.status(200).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /thoughts/:id
 * Only author can update
 */
thoughtsRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateThoughtSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.updateThought(req.user!, req.params.id, req.body);
      res.status(200).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

thoughtsRouter.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateThoughtSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.updateThought(req.user!, req.params.id, req.body);
      res.status(200).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /thoughts/:id
 * Only author can delete
 */
thoughtsRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ThoughtService.deleteThought(req.user!, req.params.id);
      res.status(200).json({ message: "Thought deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /thoughts/:id/responses
 * Only partner can add response (never author)
 */
thoughtsRouter.post(
  "/:id/responses",
  validateParams(idParamSchema),
  validateBody(responseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.addResponse(req.user!, req.params.id, req.body);
      res.status(201).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /thoughts/:id/react
 * Quick emoji reaction on a thought
 */
thoughtsRouter.post(
  "/:id/react",
  validateParams(idParamSchema),
  validateBody(z.object({ emoji: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thought = await ThoughtService.addResponse(req.user!, req.params.id, {
        emoji: req.body.emoji,
      });
      res.status(200).json(thought);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /thoughts/check-in
 * Manually trigger insecurity check-in job
 */
thoughtsRouter.post("/check-in", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await ThoughtService.runInsecurityCheckIns();
    res.status(200).json({ message: "Insecurity check-in job processed.", sentCount: count });
  } catch (error) {
    next(error);
  }
});

