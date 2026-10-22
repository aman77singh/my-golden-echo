import { Schema, model, Document, Types } from "mongoose";
import { CycleFlow } from "../types/shared.js";

export interface ICycleDoc extends Document {
  userId: Types.ObjectId;
  coupleId: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  flow?: CycleFlow;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cycleSchema = new Schema<ICycleDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    flow: {
      type: String,
      enum: ["light", "medium", "heavy", "spotting"],
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Cycle = model<ICycleDoc>("Cycle", cycleSchema);
