import { Schema, model, Document, Types } from "mongoose";
import { GoalStatus } from "../types/shared.js";

export interface IGoalDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  category: string;
  targetCount?: number;
  unit?: string;
  deadline?: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoalDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    targetCount: { type: Number },
    unit: { type: String },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ["active", "completed", "paused", "abandoned"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

export const Goal = model<IGoalDoc>("Goal", goalSchema);
