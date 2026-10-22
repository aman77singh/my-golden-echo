import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Note } from "../models/Note.js";
import { emitToCouple } from "../socket.js";
import { sendToPartner } from "../services/pushService.js";

export const notesRouter = Router();

notesRouter.use(requireAuth);

const createNoteSchema = z.object({
  body: z.string().min(1, "Note body is required"),
  kind: z.enum(["love", "reminder", "gratitude", "custom", "ping", "badday"]).optional().default("love"),
});

/**
 * POST /notes
 * Creates note or sends 'ping'
 */
notesRouter.post(
  "/",
  validateBody(createNoteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await Note.create({
        coupleId: new Types.ObjectId(req.user!.coupleId),
        fromId: new Types.ObjectId(req.user!.id),
        body: req.body.body,
        kind: req.body.kind,
      });

      emitToCouple(req.user!.coupleId, "note:new", {
        note,
        senderId: req.user!.id,
        senderName: req.user!.name,
      });

      // Push notifications for ping, bad day mode, and love notes
      if (req.body.kind === "ping") {
        sendToPartner(req.user!.id, {
          title: "Thinking of You ❤️",
          body: `${req.user!.name} is thinking of you right now.`,
          category: "messages",
          url: "/app",
        }).catch(() => {});
      } else if (req.body.kind === "badday") {
        sendToPartner(
          req.user!.id,
          {
            title: "Soft Day Mode Activated 🤍",
            body: `${req.user!.name} is having a tough day and needs extra gentle care and patience.`,
            category: "thoughts",
            url: "/app",
          },
          true // allow bad day alert even in quiet hours as it's an urgent emotional signal
        ).catch(() => {});
      } else {
        sendToPartner(req.user!.id, {
          title: `Note from ${req.user!.name} 💌`,
          body: req.body.body,
          category: "messages",
          url: "/app",
        }).catch(() => {});
      }

      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /notes
 */
notesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = {
      coupleId: new Types.ObjectId(req.user!.coupleId),
    };

    if (req.query.kind) {
      query.kind = req.query.kind;
    }

    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 100;

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json(notes);
  } catch (error) {
    next(error);
  }
});
