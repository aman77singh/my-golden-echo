import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { MessageService } from "../services/messageService.js";

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

const sendMessageSchema = z.object({
  body: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  voiceUrl: z.string().url().optional(),
  replyTo: z.string().optional(),
}).refine((data) => data.body || data.mediaUrl || data.voiceUrl, {
  message: "Message must contain text, media, or voice audio.",
});

const reactionSchema = z.object({
  emoji: z.string().min(1, "Emoji is required"),
});

const idParamSchema = z.object({
  id: z.string(),
});

const getQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  before: z.string().optional(),
});

/**
 * POST /messages
 */
messagesRouter.post(
  "/",
  validateBody(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await MessageService.sendMessage(req.user!, req.body);
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /messages
 */
messagesRouter.get(
  "/",
  validateQuery(getQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messages = await MessageService.getMessages(req.user!, req.query);
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /messages/seen
 */
messagesRouter.post("/seen", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await MessageService.markSeen(req.user!);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /messages/:id
 * Only sender deletes
 */
messagesRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await MessageService.deleteMessage(req.user!, req.params.id);
      res.status(200).json({ message: "Message deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /messages/:id/react & POST /messages/:id/reactions
 */
const handleReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = await MessageService.toggleReaction(
      req.user!,
      req.params.id,
      req.body.emoji
    );
    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

messagesRouter.post(
  "/:id/react",
  validateParams(idParamSchema),
  validateBody(reactionSchema),
  handleReaction
);

messagesRouter.post(
  "/:id/reactions",
  validateParams(idParamSchema),
  validateBody(reactionSchema),
  handleReaction
);
