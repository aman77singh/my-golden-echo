import { Schema, model, Document, Types } from "mongoose";

export interface IConversationAnswerDoc {
  userId: Types.ObjectId;
  answer: string;
  answeredAt: Date;
}

export interface IConversationStarterDoc extends Document {
  coupleId: Types.ObjectId;
  question: string;
  date: string; // YYYY-MM-DD
  answers: Types.DocumentArray<IConversationAnswerDoc & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answer: { type: String, required: true, trim: true },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationStarterSchema = new Schema<IConversationStarterDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    question: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    answers: [answerSchema],
  },
  { timestamps: true }
);

export const ConversationStarter = model<IConversationStarterDoc>(
  "ConversationStarter",
  conversationStarterSchema
);
