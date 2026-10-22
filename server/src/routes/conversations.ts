import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { ConversationStarter } from "../models/ConversationStarter.js";
import { User } from "../models/User.js";
import { emitToCouple } from "../socket.js";
import { sendToPartner } from "../services/pushService.js";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

const CURATED_QUESTIONS = [
  "What is a tiny moment from this week that made you smile thinking of us?",
  "If we could teleport to any quiet place right now for one hour, where would you take me?",
  "What is one dream you haven't talked about in a while that you still hold close?",
  "What is your favorite memory of us when we couldn't stop laughing?",
  "What is something I do without realizing that always makes you feel loved?",
  "If we wrote a song about our relationship, what would the first line be?",
  "What is one ritual or tradition you want us to keep forever?",
  "What is a quality of yours that you are learning to love more?",
  "When did you first realize that I was your safe space?",
  "What is a cozy comfort meal that reminds you of warmth and home?",
  "What is one thing we accomplished together that you feel most proud of?",
  "What is a song that instantly brings you back to a specific day we spent together?",
  "How can I best support you in your personal goals over the next month?",
  "What is something adventurous or silly you secretly want us to try together?",
];

function getDailyQuestion(dateStr: string): string {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return CURATED_QUESTIONS[hash % CURATED_QUESTIONS.length];
}

/**
 * GET /conversations/today
 * Returns today's prompt with answer concealment logic
 */
conversationsRouter.get("/today", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const userId = req.user!.id;
    const todayStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

    let starter = await ConversationStarter.findOne({ coupleId, date: todayStr });

    if (!starter) {
      starter = await ConversationStarter.create({
        coupleId,
        question: getDailyQuestion(todayStr),
        date: todayStr,
        answers: [],
      });
    }

    const partner = await User.findOne({
      coupleId,
      _id: { $ne: new Types.ObjectId(userId) },
    });

    const myAnswerDoc = starter.answers.find((a) => a.userId.toString() === userId);
    const partnerAnswerDoc = partner
      ? starter.answers.find((a) => a.userId.toString() === partner._id.toString())
      : null;

    const bothAnswered = Boolean(myAnswerDoc && partnerAnswerDoc);

    res.status(200).json({
      _id: starter._id.toString(),
      question: starter.question,
      date: starter.date,
      bothAnswered,
      myAnswer: myAnswerDoc ? myAnswerDoc.answer : null,
      partnerAnswer: bothAnswered ? partnerAnswerDoc?.answer : null,
      partnerAnswered: Boolean(partnerAnswerDoc),
      partnerName: partner?.name || "Partner",
    });
  } catch (error) {
    next(error);
  }
});

const submitAnswerSchema = z.object({
  answer: z.string().min(1, "Answer cannot be empty"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /conversations/today
 * Submits user's answer
 */
conversationsRouter.post(
  "/today",
  validateBody(submitAnswerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coupleId = new Types.ObjectId(req.user!.coupleId);
      const userId = req.user!.id;
      const todayStr = req.body.date || new Date().toISOString().split("T")[0];

      let starter = await ConversationStarter.findOne({ coupleId, date: todayStr });
      if (!starter) {
        starter = await ConversationStarter.create({
          coupleId,
          question: getDailyQuestion(todayStr),
          date: todayStr,
          answers: [],
        });
      }

      const existingIndex = starter.answers.findIndex((a) => a.userId.toString() === userId);
      if (existingIndex !== -1) {
        starter.answers[existingIndex].answer = req.body.answer;
        starter.answers[existingIndex].answeredAt = new Date();
      } else {
        starter.answers.push({
          userId: new Types.ObjectId(userId),
          answer: req.body.answer,
          answeredAt: new Date(),
        } as any);
      }

      await starter.save();

      const partner = await User.findOne({
        coupleId,
        _id: { $ne: new Types.ObjectId(userId) },
      });

      const partnerAnswerDoc = partner
        ? starter.answers.find((a) => a.userId.toString() === partner._id.toString())
        : null;

      const bothAnswered = Boolean(partnerAnswerDoc);

      if (bothAnswered) {
        emitToCouple(req.user!.coupleId, "conversation:revealed", {
          date: starter.date,
          starter,
        });

        sendToPartner(userId, {
          title: "Both Answered Today's Prompt! ✨",
          body: `Reveal time: see what ${req.user!.name} answered!`,
          category: "thoughts",
          url: "/app/more/conversation",
        }).catch(() => {});
      } else {
        emitToCouple(req.user!.coupleId, "conversation:answered", {
          date: starter.date,
          answeredBy: userId,
        });

        sendToPartner(userId, {
          title: "Daily Question Answered 💌",
          body: `${req.user!.name} shared their answer! Add yours to reveal both.`,
          category: "thoughts",
          url: "/app/more/conversation",
        }).catch(() => {});
      }

      res.status(200).json({
        success: true,
        bothAnswered,
        myAnswer: req.body.answer,
        partnerAnswer: bothAnswered ? partnerAnswerDoc?.answer : null,
      });
    } catch (error) {
      next(error);
    }
  }
);
