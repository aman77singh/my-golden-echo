import { Schema, model, Document, Types } from "mongoose";

export interface IGratitudeDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  date: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const gratitudeSchema = new Schema<IGratitudeDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const Gratitude = model<IGratitudeDoc>("Gratitude", gratitudeSchema);
