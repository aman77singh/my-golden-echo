import { Schema, model, Document, Types } from "mongoose";
import { NoteKind } from "../types/shared.js";

export interface INoteDoc extends Document {
  coupleId: Types.ObjectId;
  fromId: Types.ObjectId;
  body: string;
  kind?: NoteKind;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INoteDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    fromId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true },
    kind: { type: String, enum: ["love", "reminder", "gratitude", "custom", "ping"], default: "love" },
  },
  { timestamps: true }
);

export const Note = model<INoteDoc>("Note", noteSchema);
