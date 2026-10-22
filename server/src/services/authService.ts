import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, IUserDoc } from "../models/User.js";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";
import { AuthUser, LoginResponse } from "../types/shared.js";
import { emitToCouple } from "../socket.js";

interface TokenPayload {
  userId: string;
  coupleId: string;
}

export function formatAuthUser(user: IUserDoc): AuthUser {
  return {
    id: user._id.toString(),
    coupleId: user.coupleId.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    shareCycle: user.shareCycle,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone || "Asia/Kolkata",
    notificationPrefs: user.notificationPrefs || {
      messages: true,
      progress: true,
      thoughts: true,
      cycle: true,
      reminders: true,
    },
    quietHours: user.quietHours || {
      enabled: false,
      start: "22:00",
      end: "08:00",
    },
    reminders: user.reminders || {
      eveningProgressHour: 20,
    },
  };
}

export async function initializeCycleSharingPreference(user: IUserDoc): Promise<void> {
  if (user.role !== "her" || user.cycleSharingPreferenceConfigured) {
    return;
  }

  const initializedUser = await User.findOneAndUpdate(
    { _id: user._id, cycleSharingPreferenceConfigured: { $ne: true } },
    { $set: { shareCycle: true, cycleSharingPreferenceConfigured: true } },
    { new: true }
  );

  if (initializedUser) {
    user.shareCycle = true;
    user.cycleSharingPreferenceConfigured = true;
    emitToCouple(initializedUser.coupleId.toString(), "privacy:update", {
      userId: initializedUser._id.toString(),
      shareCycle: true,
    });
    return;
  }

  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    throw new UnauthorizedError("User no longer exists.");
  }
  user.shareCycle = currentUser.shareCycle;
  user.cycleSharingPreferenceConfigured = currentUser.cycleSharingPreferenceConfigured;
}

export function generateAccessToken(user: IUserDoc): string {
  return jwt.sign(
    { userId: user._id.toString(), coupleId: user.coupleId.toString() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
  );
}

export function generateRefreshToken(user: IUserDoc): string {
  return jwt.sign(
    { userId: user._id.toString(), coupleId: user.coupleId.toString() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
  );
}

export async function loginUser(email: string, password: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  await initializeCycleSharingPreference(user);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is required.");
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Refresh token has expired. Please log in again.");
    }
    throw new UnauthorizedError("Invalid refresh token.");
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new UnauthorizedError("User associated with token no longer exists.");
  }

  await initializeCycleSharingPreference(user);

  const newAccessToken = generateAccessToken(user);

  return {
    accessToken: newAccessToken,
    user: formatAuthUser(user),
  };
}
