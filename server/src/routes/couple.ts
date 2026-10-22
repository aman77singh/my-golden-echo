import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Couple } from "../models/Couple.js";
import { User } from "../models/User.js";
import { NotFoundError } from "../utils/errors.js";

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

    const [couple, partner] = await Promise.all([
      Couple.findById(coupleId).lean(),
      User.findOne({ coupleId, _id: { $ne: userId } }).lean(),
    ]);

    if (!couple) {
      throw new NotFoundError("Couple record not found.");
    }

    res.status(200).json({
      couple: {
        id: couple._id.toString(),
        startDate: couple.startDate,
      },
      partner: partner
        ? {
            id: partner._id.toString(),
            name: partner.name,
            email: partner.email,
            role: partner.role,
            avatarUrl: partner.avatarUrl,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});
