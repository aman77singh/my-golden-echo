import { Schema, model, Document, Types } from "mongoose";

export interface IDateIdeaDoc extends Document {
  coupleId: Types.ObjectId;
  suggestedById: Types.ObjectId;
  title: string;
  category: "indoor" | "outdoor" | "food" | "adventure" | "chill";
  vibe?: string;
  estimatedCost?: "free" | "$" | "$$" | "$$$";
  completed: boolean;
  pulledCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const dateIdeaSchema = new Schema<IDateIdeaDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    suggestedById: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["indoor", "outdoor", "food", "adventure", "chill"],
      default: "chill",
    },
    vibe: { type: String, trim: true },
    estimatedCost: {
      type: String,
      enum: ["free", "$", "$$", "$$$"],
      default: "$",
    },
    completed: { type: Boolean, default: false },
    pulledCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DateIdea = model<IDateIdeaDoc>("DateIdea", dateIdeaSchema);
