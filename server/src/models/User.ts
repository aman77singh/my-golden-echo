import { Schema, model, Document, Types } from "mongoose";
import { UserRole } from "../types/shared.js";

export interface IUserDoc extends Document {
  coupleId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  shareCycle: boolean;
  cycleSharingPreferenceConfigured: boolean;
  avatarUrl?: string;
  timezone: string;
  notificationPrefs: {
    messages: boolean;
    progress: boolean;
    thoughts: boolean;
    cycle: boolean;
    reminders: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  reminders: {
    eveningProgressHour: number;
    lastEveningReminderAt?: Date;
    lastPeriodAlertAt?: Date;
    lastSundaySummaryAt?: Date;
  };
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
    cycleSharingPreferenceConfigured: { type: Boolean, default: false },
    avatarUrl: { type: String },
    timezone: { type: String, default: "Asia/Kolkata" },
    notificationPrefs: {
      messages: { type: Boolean, default: true },
      progress: { type: Boolean, default: true },
      thoughts: { type: Boolean, default: true },
      cycle: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "08:00" },
    },
    reminders: {
      eveningProgressHour: { type: Number, default: 20 },
      lastEveningReminderAt: { type: Date },
      lastPeriodAlertAt: { type: Date },
      lastSundaySummaryAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const User = model<IUserDoc>("User", userSchema);
