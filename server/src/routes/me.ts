import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { NotFoundError } from "../utils/errors.js";
import { emitToCouple } from "../socket.js";

export const meRouter = Router();

meRouter.use(requireAuth);

const updatePrivacySchema = z.object({
  shareCycle: z.boolean(),
});

const updateAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .max(1_500_000)
    .refine((value) => {
      if (value === "" || /^data:image\/(?:jpeg|png|webp);base64,/.test(value)) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Profile photo must be a secure image URL or an uploaded image."),
});

/**
 * GET /me
 * Returns the current authenticated user's profile
 */
meRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id).select("-passwordHash");
    if (!user) {
      throw new NotFoundError("User not found.");
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /me/avatar
 * Updates the authenticated user's profile photo
 */
meRouter.patch(
  "/avatar",
  validateBody(updateAvatarSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!.id);

      if (!user) {
        throw new NotFoundError("User not found.");
      }

      user.avatarUrl = req.body.avatarUrl || undefined;
      await user.save();

      const profile = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      };

      emitToCouple(req.user!.coupleId, "profile:update", {
        userId: user._id.toString(),
        avatarUrl: user.avatarUrl,
      });

      res.status(200).json({ user: profile });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /me/privacy
 * Toggles shareCycle privacy setting
 */
meRouter.patch(
  "/privacy",
  validateBody(updatePrivacySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        throw new NotFoundError("User not found.");
      }

      user.shareCycle = req.body.shareCycle;
      user.cycleSharingPreferenceConfigured = true;
      await user.save();

      emitToCouple(req.user!.coupleId, "privacy:update", {
        userId: user._id.toString(),
        shareCycle: user.shareCycle,
      });

      res.status(200).json({
        message: "Privacy settings updated successfully.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          shareCycle: user.shareCycle,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /me/export
 * Downloads full JSON archive of couple's data
 */
meRouter.get("/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const userId = new Types.ObjectId(req.user!.id);

    // Import models dynamically to gather all data
    const { Mood } = await import("../models/Mood.js");
    const { Note } = await import("../models/Note.js");
    const { Message } = await import("../models/Message.js");
    const { ProgressPost } = await import("../models/ProgressPost.js");
    const { Goal } = await import("../models/Goal.js");
    const { Thought } = await import("../models/Thought.js");
    const { Cycle } = await import("../models/Cycle.js");
    const { SymptomLog } = await import("../models/SymptomLog.js");
    const { Event } = await import("../models/Event.js");
    const { Gratitude } = await import("../models/Gratitude.js");
    const { WeeklyCheckIn } = await import("../models/WeeklyCheckIn.js");
    const { Surprise } = await import("../models/Surprise.js");
    const { DateIdea } = await import("../models/DateIdea.js");

    const [
      user,
      partner,
      moods,
      notes,
      messages,
      progressPosts,
      goals,
      thoughts,
      cycles,
      symptoms,
      events,
      gratitudes,
      checkins,
      surprises,
      dateIdeas,
    ] = await Promise.all([
      User.findById(userId).select("-passwordHash"),
      User.findOne({ coupleId, _id: { $ne: userId } }).select("-passwordHash"),
      Mood.find({ coupleId }),
      Note.find({ coupleId }),
      Message.find({ coupleId }),
      ProgressPost.find({ coupleId }),
      Goal.find({ coupleId }),
      Thought.find({
        coupleId,
        $or: [{ userId }, { userId: { $ne: userId }, visibility: "shared" }],
      }),
      Cycle.find({ coupleId }),
      SymptomLog.find({ coupleId }),
      Event.find({ coupleId }),
      Gratitude.find({ coupleId }),
      WeeklyCheckIn.find({ coupleId }),
      Surprise.find({ coupleId, creatorId: userId }),
      DateIdea.find({ coupleId }),
    ]);

    const archive = {
      exportedAt: new Date().toISOString(),
      user,
      partner,
      moods,
      notes,
      messages,
      progressPosts,
      goals,
      thoughts,
      cycles: req.user!.role === "her" || partner?.shareCycle ? cycles : [],
      symptoms: req.user!.role === "her" || partner?.shareCycle ? symptoms : [],
      events,
      gratitudes,
      checkins,
      surprises,
      dateIdeas,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="our-space-export-${new Date().toISOString().split("T")[0]}.json"`);
    res.status(200).json(archive);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /me
 * Delete user account and push subscriptions
 */
meRouter.delete("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = new Types.ObjectId(req.user!.id);
    const { PushSubscription } = await import("../models/PushSubscription.js");

    await PushSubscription.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    next(error);
  }
});
