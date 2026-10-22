import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { UnauthorizedError } from "../utils/errors.js";
import { AuthUser } from "../types/shared.js";
import { initializeCycleSharingPreference } from "../services/authService.js";

interface AccessTokenPayload {
  userId: string;
  coupleId: string;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token is missing.");
    }

    const token = authHeader.split(" ")[1];
    let decoded: AccessTokenPayload;

    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Access token has expired.");
      }
      throw new UnauthorizedError("Invalid access token.");
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) {
      throw new UnauthorizedError("User no longer exists.");
    }

    await initializeCycleSharingPreference(user);

    const authUser: AuthUser = {
      id: user._id.toString(),
      coupleId: user.coupleId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      shareCycle: user.shareCycle,
      avatarUrl: user.avatarUrl,
    };

    req.user = authUser;
    req.coupleId = authUser.coupleId;

    next();
  } catch (error) {
    next(error);
  }
}
