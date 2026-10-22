import { Schema, model, Document, Types } from "mongoose";
import { UserRole } from "../types/shared.js";

export interface IUserDoc extends Document {
  coupleId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  shareCycle: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["her", "him"], required: true },
    shareCycle: { type: Boolean, default: false },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUserDoc>("User", userSchema);
