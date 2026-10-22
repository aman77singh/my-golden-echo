import { Types } from "mongoose";
import { Goal, IGoalDoc } from "../models/Goal.js";
import { AuthUser, GoalStatus } from "../types/shared.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export interface CreateGoalDTO {
  title: string;
  category: string;
  targetCount?: number;
  currentCount?: number;
  unit?: string;
  deadline?: string | Date;
}

export class GoalService {
  /**
   * Create a shared or personal goal within the couple
   */
  static async createGoal(currentUser: AuthUser, data: CreateGoalDTO): Promise<IGoalDoc> {
    const goal = await Goal.create({
      coupleId: new Types.ObjectId(currentUser.coupleId),
      userId: new Types.ObjectId(currentUser.id),
      title: data.title,
      category: data.category,
      targetCount: data.targetCount,
      currentCount: data.currentCount ?? 0,
      unit: data.unit,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      status: "active",
    });

    return goal;
  }

  /**
   * Get all goals for the couple
   */
  static async getGoals(currentUser: AuthUser): Promise<IGoalDoc[]> {
    return Goal.find({
      coupleId: new Types.ObjectId(currentUser.coupleId),
    }).sort({ createdAt: -1 });
  }

  /**
   * Get single goal
   */
  static async getGoal(currentUser: AuthUser, goalId: string): Promise<IGoalDoc> {
    const goal = await Goal.findOne({
      _id: new Types.ObjectId(goalId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!goal) {
      throw new NotFoundError("Goal not found.");
    }

    return goal;
  }

  /**
   * Update goal
   */
  static async updateGoal(
    currentUser: AuthUser,
    goalId: string,
    data: Partial<CreateGoalDTO & { status: GoalStatus }>
  ): Promise<IGoalDoc> {
    const goal = await Goal.findOne({
      _id: new Types.ObjectId(goalId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!goal) {
      throw new NotFoundError("Goal not found.");
    }

    if (data.title !== undefined) goal.title = data.title;
    if (data.category !== undefined) goal.category = data.category;
    if (data.targetCount !== undefined) goal.targetCount = data.targetCount;
    if (data.currentCount !== undefined) goal.currentCount = data.currentCount;
    if (data.unit !== undefined) goal.unit = data.unit;
    if (data.deadline !== undefined) {
      goal.deadline = data.deadline ? new Date(data.deadline) : undefined;
    }
    if (data.status !== undefined) goal.status = data.status;

    // Check completion condition
    if (goal.targetCount && goal.currentCount && goal.currentCount >= goal.targetCount) {
      goal.status = "completed";
    }

    await goal.save();
    return goal;
  }

  /**
   * Delete goal
   */
  static async deleteGoal(currentUser: AuthUser, goalId: string): Promise<void> {
    const goal = await Goal.findOne({
      _id: new Types.ObjectId(goalId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!goal) {
      throw new NotFoundError("Goal not found.");
    }

    await goal.deleteOne();
  }
}
