import { Schema, model, Document, Types } from "mongoose";

export interface ISurpriseDoc extends Document {
  coupleId: Types.ObjectId;
  creatorId: Types.ObjectId;
  title: string;
  notes?: string;
  targetDate?: Date;
  budget?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const surpriseSchema = new Schema<ISurpriseDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    targetDate: { type: Date },
    budget: { type: String, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Surprise = model<ISurpriseDoc>("Surprise", surpriseSchema);
