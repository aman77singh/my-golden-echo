import { Schema, model, Document, Types } from "mongoose";
import { ThoughtKind, ThoughtVisibility } from "../types/shared.js";

export interface IThoughtResponseDoc {
  userId: Types.ObjectId;
  emoji?: string;
  note?: string;
  createdAt: Date;
}

export interface IThoughtDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  kind: ThoughtKind;
  visibility: ThoughtVisibility;
  justVenting?: boolean;
  responses: Types.DocumentArray<IThoughtResponseDoc & Document>;
  checkInSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const thoughtResponseSchema = new Schema<IThoughtResponseDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String },
    note: { type: String, maxlength: 200 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const thoughtSchema = new Schema<IThoughtDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true },
    kind: { type: String, enum: ["thought", "insecurity"], required: true },
    visibility: {
      type: String,
      enum: ["private", "shared"],
      required: true,
      default: function (this: IThoughtDoc) {
        return this.kind === "insecurity" ? "private" : "shared";
      },
    },
    justVenting: { type: Boolean, default: false },
    responses: { type: [thoughtResponseSchema], default: [] },
    checkInSentAt: { type: Date },
  },
  { timestamps: true }
);

export const Thought = model<IThoughtDoc>("Thought", thoughtSchema);
