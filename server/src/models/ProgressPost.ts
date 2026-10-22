import { Schema, model, Document, Types } from "mongoose";
import { IReactionDoc } from "./Message.js";

export interface IProgressReplyDoc {
  userId: Types.ObjectId;
  body?: string;
  voiceUrl?: string;
  quickCheer?: string;
  createdAt: Date;
}

export interface IProgressPostDoc extends Document {
  coupleId: Types.ObjectId;
  userId: Types.ObjectId;
  goalId?: Types.ObjectId;
  category: string;
  body: string;
  countAdded?: number;
  minutes?: number;
  struggled?: boolean;
  mediaUrls: string[];
  voiceUrl?: string;
  replies: Types.DocumentArray<IProgressReplyDoc & Document>;
  reactions: IReactionDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IProgressReplyDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String },
    voiceUrl: { type: String },
    quickCheer: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const reactionSchema = new Schema<IReactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const progressPostSchema = new Schema<IProgressPostDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    category: { type: String, required: true },
    body: { type: String, required: true },
    countAdded: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    struggled: { type: Boolean, default: false },
    mediaUrls: { type: [String], default: [] },
    voiceUrl: { type: String },
    replies: { type: [replySchema], default: [] },
    reactions: { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);

export const ProgressPost = model<IProgressPostDoc>("ProgressPost", progressPostSchema);
