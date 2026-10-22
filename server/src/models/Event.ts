import { Schema, model, Document, Types } from "mongoose";

export interface IEventDoc extends Document {
  coupleId: Types.ObjectId;
  title: string;
  date: Date;
  remindDaysBefore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEventDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    remindDaysBefore: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Event = model<IEventDoc>("Event", eventSchema);
