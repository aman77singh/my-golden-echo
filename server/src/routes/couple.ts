import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Couple } from "../models/Couple.js";
import { User } from "../models/User.js";
import { NotFoundError } from "../utils/errors.js";
import { initializeCycleSharingPreference } from "../services/authService.js";

export const coupleRouter = Router();

coupleRouter.use(requireAuth);

/**
 * GET /couple
 * Returns couple info (startDate) and partner profile
 */
coupleRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupleId = new Types.ObjectId(req.user!.coupleId);
    const userId = new Types.ObjectId(req.user!.id);

    const [couple, user, partner] = await Promise.all([
      Couple.findById(coupleId).lean(),
      User.findById(userId).select("_id name email role shareCycle avatarUrl").lean(),
      User.findOne({ coupleId, _id: { $ne: userId } }),
    ]);

    if (!couple) {
      throw new NotFoundError("Couple record not found.");
    }

    if (partner) {
      await initializeCycleSharingPreference(partner);
    }

    res.status(200).json({
      couple: {
        _id: couple._id.toString(),
        id: couple._id.toString(),
        startDate: couple.startDate,
      },
      user: user
        ? {
            _id: user._id.toString(),
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            shareCycle: user.shareCycle,
            avatarUrl: user.avatarUrl,
          }
        : null,
      partner: partner
        ? {
            _id: partner._id.toString(),
            id: partner._id.toString(),
            name: partner.name,
            email: partner.email,
            role: partner.role,
            shareCycle: partner.shareCycle,
            avatarUrl: partner.avatarUrl,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});
