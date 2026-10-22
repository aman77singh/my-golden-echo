import { Schema, model, Document, Types } from "mongoose";

export interface IReactionDoc {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IMessageDoc extends Document {
  coupleId: Types.ObjectId;
  senderId: Types.ObjectId;
  body?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  replyTo?: Types.ObjectId;
  seenAt?: Date;
  reactions: IReactionDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<IReactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessageDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String },
    mediaUrl: { type: String },
    voiceUrl: { type: String },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    seenAt: { type: Date },
    reactions: { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);

export const Message = model<IMessageDoc>("Message", messageSchema);
