import { Schema, model, Document } from "mongoose";

export interface ICoupleDoc extends Document {
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const coupleSchema = new Schema<ICoupleDoc>(
  {
    startDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Couple = model<ICoupleDoc>("Couple", coupleSchema);
