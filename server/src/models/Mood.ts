import { Schema, model, Document, Types } from "mongoose";

export interface IMoodDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  emoji: string;
  energy: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const moodSchema = new Schema<IMoodDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    emoji: { type: String, required: true },
    energy: { type: Number, required: true, min: 1, max: 5 },
    note: { type: String },
  },
  { timestamps: true }
);

export const Mood = model<IMoodDoc>("Mood", moodSchema);
