import { Types } from "mongoose";
import { Mood, IMoodDoc } from "../models/Mood.js";
import { User } from "../models/User.js";
import { AuthUser } from "../types/shared.js";
import { emitToCouple } from "../socket.js";

export interface CreateMoodDTO {
  emoji: string;
  energy: number;
  note?: string;
}

export interface LatestMoodResponse {
  mine: IMoodDoc | null;
  partner: IMoodDoc | null;
  partnerName: string;
}

export class MoodService {
  /**
   * Log a new mood and broadcast to the couple room via Socket.IO
   */
  static async logMood(currentUser: AuthUser, data: CreateMoodDTO): Promise<IMoodDoc> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);
    const userId = new Types.ObjectId(currentUser.id);

    const mood = await Mood.create({
      coupleId,
      userId,
      emoji: data.emoji,
      energy: data.energy,
      note: data.note,
    });

    // Real-time notification to partner in couple room
    emitToCouple(currentUser.coupleId, "mood:update", {
      mood,
      userId: currentUser.id,
      userName: currentUser.name,
    });

    return mood;
  }

  /**
   * Get latest mood for both partners in the couple
   */
  static async getLatestMoods(currentUser: AuthUser): Promise<LatestMoodResponse> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);
    const userId = new Types.ObjectId(currentUser.id);

    const partner = await User.findOne({
      coupleId,
      _id: { $ne: userId },
    }).lean();

    const [mine, partnerMood] = await Promise.all([
      Mood.findOne({ coupleId, userId }).sort({ createdAt: -1 }),
      partner ? Mood.findOne({ coupleId, userId: partner._id }).sort({ createdAt: -1 }) : null,
    ]);

    return {
      mine,
      partner: partnerMood,
      partnerName: partner?.name || "Partner",
    };
  }

  /**
   * Get moods in couple within optional date range (for calendar history)
   */
  static async getMoodHistory(
    currentUser: AuthUser,
    from?: string,
    to?: string
  ): Promise<IMoodDoc[]> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);
    const query: any = { coupleId };

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = from.length === 10 ? new Date(`${from}T00:00:00.000Z`) : new Date(from);
      }
      if (to) {
        query.createdAt.$lte = to.length === 10 ? new Date(`${to}T23:59:59.999Z`) : new Date(to);
      }
    }

    return Mood.find(query).sort({ createdAt: 1 });
  }
}
