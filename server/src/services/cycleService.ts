import { Types } from "mongoose";
import { Cycle, ICycleDoc } from "../models/Cycle.js";
import { SymptomLog, ISymptomLogDoc } from "../models/SymptomLog.js";
import { User } from "../models/User.js";
import { AuthUser, CycleFlow } from "../types/shared.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

export interface CreateCycleDTO {
  startDate: string | Date;
  endDate?: string | Date;
  flow?: CycleFlow;
  notes?: string;
}

export interface UpdateCycleDTO {
  startDate?: string | Date;
  endDate?: string | Date;
  flow?: CycleFlow;
  notes?: string;
}

export interface SymptomLogDTO {
  date: string; // YYYY-MM-DD
  symptoms: string[];
  pain?: number;
  mood?: string;
}

export class CycleService {
  /**
   * Only the owner (role 'her') may create their cycle record.
   */
  static async createCycle(currentUser: AuthUser, data: CreateCycleDTO): Promise<ICycleDoc> {
    if (currentUser.role !== "her") {
      throw new ForbiddenError("Only the owner may create or modify cycle records.");
    }

    const cycle = await Cycle.create({
      userId: new Types.ObjectId(currentUser.id),
      coupleId: new Types.ObjectId(currentUser.coupleId),
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      flow: data.flow,
      notes: data.notes,
    });
    return cycle;
  }

  /**
   * Retrieve cycle records.
   * If currentUser is owner ('her'), returns own cycles.
   * If partner ('him'), may read only if owner's shareCycle is true.
   */
  static async getCycles(currentUser: AuthUser, targetUserId?: string): Promise<ICycleDoc[]> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);

    // If owner ('her') is fetching
    if (currentUser.role === "her" && (!targetUserId || targetUserId === currentUser.id)) {
      return Cycle.find({ coupleId, userId: new Types.ObjectId(currentUser.id) }).sort({ startDate: -1 });
    }

    // Partner ('him') is requesting cycle data
    const owner = await User.findOne({
      coupleId,
      role: "her",
    }).lean();

    if (!owner) {
      return [];
    }

    // Check shareCycle flag
    if (!owner.shareCycle) {
      throw new ForbiddenError("Your partner has not shared cycle data.");
    }

    return Cycle.find({
      coupleId,
      userId: owner._id,
    }).sort({ startDate: -1 });
  }

  /**
   * Only the owner may update.
   */
  static async updateCycle(
    currentUser: AuthUser,
    cycleId: string,
    data: UpdateCycleDTO
  ): Promise<ICycleDoc> {
    if (currentUser.role !== "her") {
      throw new ForbiddenError("Only the owner may create or modify cycle records.");
    }

    const cycle = await Cycle.findOne({
      _id: new Types.ObjectId(cycleId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!cycle) {
      throw new NotFoundError("Cycle record not found.");
    }

    if (cycle.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the owner may update this cycle record.");
    }

    if (data.startDate !== undefined) cycle.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) cycle.endDate = data.endDate ? new Date(data.endDate) : undefined;
    if (data.flow !== undefined) cycle.flow = data.flow;
    if (data.notes !== undefined) cycle.notes = data.notes;

    await cycle.save();
    return cycle;
  }

  /**
   * Only the owner may delete.
   */
  static async deleteCycle(currentUser: AuthUser, cycleId: string): Promise<void> {
    if (currentUser.role !== "her") {
      throw new ForbiddenError("Only the owner may create or modify cycle records.");
    }

    const cycle = await Cycle.findOne({
      _id: new Types.ObjectId(cycleId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!cycle) {
      throw new NotFoundError("Cycle record not found.");
    }

    if (cycle.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the owner may delete this cycle record.");
    }

    await cycle.deleteOne();
  }

  /**
   * Create or update symptom log.
   * Only the owner may create or update.
   */
  static async logSymptoms(currentUser: AuthUser, data: SymptomLogDTO): Promise<ISymptomLogDoc> {
    if (currentUser.role !== "her") {
      throw new ForbiddenError("Only the owner may create or modify cycle records.");
    }

    const log = await SymptomLog.findOneAndUpdate(
      {
        userId: new Types.ObjectId(currentUser.id),
        date: data.date,
      },
      {
        coupleId: new Types.ObjectId(currentUser.coupleId),
        userId: new Types.ObjectId(currentUser.id),
        date: data.date,
        symptoms: data.symptoms,
        pain: data.pain,
        mood: data.mood,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return log;
  }

  /**
   * Get symptom logs.
   * Partner may read only if owner's shareCycle is true.
   */
  static async getSymptomLogs(
    currentUser: AuthUser,
    targetUserId?: string,
    date?: string
  ): Promise<ISymptomLogDoc[]> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);

    // If owner ('her')
    if (currentUser.role === "her" && (!targetUserId || targetUserId === currentUser.id)) {
      const query: any = {
        coupleId,
        userId: new Types.ObjectId(currentUser.id),
      };
      if (date) query.date = date;
      return SymptomLog.find(query).sort({ date: -1 });
    }

    // Partner ('him')
    const owner = await User.findOne({
      coupleId,
      role: "her",
    }).lean();

    if (!owner) {
      return [];
    }

    if (!owner.shareCycle) {
      throw new ForbiddenError("Your partner has not shared cycle data.");
    }

    const query: any = {
      coupleId,
      userId: owner._id,
    };
    if (date) query.date = date;

    return SymptomLog.find(query).sort({ date: -1 });
  }

  /**
   * Only the owner may delete a symptom log.
   */
  static async deleteSymptomLog(currentUser: AuthUser, logId: string): Promise<void> {
    if (currentUser.role !== "her") {
      throw new ForbiddenError("Only the owner may create or modify cycle records.");
    }

    const log = await SymptomLog.findOne({
      _id: new Types.ObjectId(logId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!log) {
      throw new NotFoundError("Symptom log not found.");
    }

    if (log.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the owner may delete this symptom log.");
    }

    await log.deleteOne();
  }
}
