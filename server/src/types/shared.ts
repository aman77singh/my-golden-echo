export type UserRole = "her" | "him";

export type GoalStatus = "active" | "completed" | "paused" | "abandoned";

export type ThoughtKind = "thought" | "insecurity";
export type ThoughtVisibility = "private" | "shared";

export type NoteKind = "love" | "reminder" | "gratitude" | "custom" | "ping" | "badday";

export type CycleFlow = "light" | "medium" | "heavy" | "spotting";

export interface ICouple {
  _id: string;
  startDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface INotificationPrefs {
  messages: boolean;
  progress: boolean;
  thoughts: boolean;
  cycle: boolean;
  reminders: boolean;
}

export interface IQuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface IRemindersConfig {
  eveningProgressHour: number;
  lastEveningReminderAt?: string | Date;
  lastPeriodAlertAt?: string | Date;
  lastSundaySummaryAt?: string | Date;
}

export interface IUser {
  _id: string;
  coupleId: string;
  name: string;
  email: string;
  role: UserRole;
  shareCycle: boolean;
  avatarUrl?: string;
  timezone?: string;
  notificationPrefs?: INotificationPrefs;
  quietHours?: IQuietHours;
  reminders?: IRemindersConfig;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IReaction {
  userId: string;
  emoji: string;
}

export interface IMessage {
  _id: string;
  coupleId: string;
  senderId: string;
  body?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  replyTo?: string;
  seenAt?: string | Date;
  reactions: IReaction[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IMood {
  _id: string;
  coupleId: string;
  userId: string;
  emoji: string;
  energy: number; // 1-5
  note?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IGoal {
  _id: string;
  coupleId: string;
  userId: string;
  title: string;
  category: string;
  targetCount?: number;
  currentCount?: number;
  unit?: string;
  deadline?: string | Date;
  status: GoalStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IProgressReply {
  userId: string;
  body?: string;
  voiceUrl?: string;
  quickCheer?: string;
  createdAt: string | Date;
}

export interface IProgressPost {
  _id: string;
  coupleId: string;
  userId: string;
  goalId?: string;
  category: string;
  body: string;
  countAdded?: number;
  minutes?: number;
  struggled?: boolean;
  mediaUrls: string[];
  voiceUrl?: string;
  replies: IProgressReply[];
  reactions: IReaction[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICycle {
  _id: string;
  userId: string;
  coupleId: string;
  startDate: string | Date;
  endDate?: string | Date;
  flow?: CycleFlow;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ISymptomLog {
  _id: string;
  userId: string;
  coupleId: string;
  date: string; // YYYY-MM-DD
  symptoms: string[];
  pain?: number; // 0-10
  mood?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IThoughtResponse {
  userId: string;
  emoji?: string;
  note?: string; // up to 200 chars for insecurity
  createdAt: string | Date;
}

export interface IThought {
  _id: string;
  coupleId: string;
  userId: string;
  body: string;
  kind: ThoughtKind;
  visibility: ThoughtVisibility;
  justVenting?: boolean;
  responses: IThoughtResponse[];
  checkInSentAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface INote {
  _id: string;
  coupleId: string;
  fromId: string;
  body: string;
  kind?: NoteKind;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IEvent {
  _id: string;
  coupleId: string;
  title: string;
  date: string | Date;
  remindDaysBefore?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription {
  _id: string;
  userId: string;
  endpoint: string;
  keys: IPushSubscriptionKeys;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthUser {
  id: string;
  coupleId: string;
  name: string;
  email: string;
  role: UserRole;
  shareCycle: boolean;
  avatarUrl?: string;
  timezone?: string;
  notificationPrefs?: INotificationPrefs;
  quietHours?: IQuietHours;
  reminders?: IRemindersConfig;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  user: AuthUser;
}

export interface CloudinarySignedUploadResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface IGratitude {
  _id: string;
  coupleId: string;
  userId: string;
  body: string;
  date: string;
  createdAt: string | Date;
}

export interface IConversationAnswer {
  userId: string;
  answer?: string;
  answeredAt: string | Date;
}

export interface IConversationStarter {
  _id: string;
  coupleId: string;
  question: string;
  date: string;
  answers: IConversationAnswer[];
  bothAnswered: boolean;
  myAnswer?: string;
  partnerAnswer?: string;
  createdAt: string | Date;
}

export interface IWeeklyCheckInRatings {
  communication: number;
  intimacy: number;
  fun: number;
  support: number;
}

export interface IWeeklyCheckIn {
  _id: string;
  coupleId: string;
  userId: string;
  weekStart: string;
  ratings: IWeeklyCheckInRatings;
  highlight?: string;
  oneThingToImprove: string;
  createdAt: string | Date;
}

export interface ISurprise {
  _id: string;
  coupleId: string;
  creatorId: string;
  title: string;
  notes?: string;
  targetDate?: string | Date;
  budget?: string;
  completed: boolean;
  createdAt: string | Date;
}

export interface IDateIdea {
  _id: string;
  coupleId: string;
  suggestedById: string;
  title: string;
  category: "indoor" | "outdoor" | "food" | "adventure" | "chill";
  vibe?: string;
  estimatedCost?: "free" | "$" | "$$" | "$$$";
  completed: boolean;
  pulledCount: number;
  createdAt: string | Date;
}
