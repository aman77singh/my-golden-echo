import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { ProgressService } from "../services/progressService.js";

export const progressRouter = Router();

progressRouter.use(requireAuth);

const createPostSchema = z.object({
  goalId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  body: z.string().min(1, "Post body is required"),
  countAdded: z.number().optional(),
  minutes: z.number().optional(),
  struggled: z.boolean().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  voiceUrl: z.string().url().optional(),
});

const updatePostSchema = createPostSchema.partial();

const replySchema = z.object({
  body: z.string().optional(),
  voiceUrl: z.string().url().optional(),
  quickCheer: z.string().optional(),
});

const reactionSchema = z.object({
  emoji: z.string().min(1, "Emoji is required"),
});

const idParamSchema = z.object({
  id: z.string(),
});

const replyIdParamSchema = z.object({
  id: z.string(),
  replyId: z.string(),
});

const getQuerySchema = z.object({
  category: z.string().optional(),
  goalId: z.string().optional(),
  limit: z.coerce.number().optional(),
  skip: z.coerce.number().optional(),
});

/**
 * POST /progress
 */
progressRouter.post(
  "/",
  validateBody(createPostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.createPost(req.user!, req.body);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /progress
 */
progressRouter.get(
  "/",
  validateQuery(getQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const posts = await ProgressService.getPosts(req.user!, req.query);
      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /progress/status
 * Check if partner posted progress or reacted to mine today
 */
progressRouter.get(
  "/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await ProgressService.getProgressStatus(req.user!);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /progress/:id
 * Only author edits
 */
progressRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updatePostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.updatePost(req.user!, req.params.id, req.body);
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }
);

progressRouter.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updatePostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.updatePost(req.user!, req.params.id, req.body);
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /progress/:id
 * Only author deletes
 */
progressRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ProgressService.deletePost(req.user!, req.params.id);
      res.status(200).json({ message: "Progress post deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /progress/:id/replies
 */
progressRouter.post(
  "/:id/replies",
  validateParams(idParamSchema),
  validateBody(replySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.addReply(req.user!, req.params.id, req.body);
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /progress/:id/replies/:replyId
 * Users delete ONLY their own replies
 */
progressRouter.delete(
  "/:id/replies/:replyId",
  validateParams(replyIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.deleteReply(
        req.user!,
        req.params.id,
        req.params.replyId
      );
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /progress/:id/reactions
 * Toggle reaction
 */
progressRouter.post(
  "/:id/reactions",
  validateParams(idParamSchema),
  validateBody(reactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await ProgressService.toggleReaction(
        req.user!,
        req.params.id,
        req.body.emoji
      );
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }
);
