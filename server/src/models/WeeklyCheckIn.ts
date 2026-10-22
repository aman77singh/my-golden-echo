import { Schema, model, Document, Types } from "mongoose";

export interface IWeeklyCheckInDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  weekStart: string; // YYYY-MM-DD (e.g. Monday date)
  ratings: {
    communication: number; // 1-5
    intimacy: number;      // 1-5
    fun: number;           // 1-5
    support: number;       // 1-5
  };
  highlight?: string;
  oneThingToImprove: string;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyCheckInSchema = new Schema<IWeeklyCheckInDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStart: { type: String, required: true, index: true },
    ratings: {
      communication: { type: Number, min: 1, max: 5, required: true },
      intimacy: { type: Number, min: 1, max: 5, required: true },
      fun: { type: Number, min: 1, max: 5, required: true },
      support: { type: Number, min: 1, max: 5, required: true },
    },
    highlight: { type: String, trim: true },
    oneThingToImprove: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const WeeklyCheckIn = model<IWeeklyCheckInDoc>("WeeklyCheckIn", weeklyCheckInSchema);
