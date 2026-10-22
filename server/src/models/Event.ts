import { Schema, model, Document, Types } from "mongoose";

export interface IEventDoc extends Document {
  coupleId: Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  remindDaysBefore?: number;
  category?: string; // anniversary, date, trip, milestone, custom
  isCountdown?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEventDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    remindDaysBefore: { type: Number, default: 1 },
    category: { type: String, default: "custom" },
    isCountdown: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Event = model<IEventDoc>("Event", eventSchema);
