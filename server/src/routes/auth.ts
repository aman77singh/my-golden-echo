import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { loginUser, refreshAccessToken } from "../services/authService.js";
import { env } from "../config/env.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const REFRESH_COOKIE_NAME = "refreshToken";

// Cookie options for refresh token
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
};

/**
 * POST /auth/login
 * Stricter rate limit on login attempts
 */
authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await loginUser(email, password);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

      res.status(200).json({
        accessToken,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/refresh
 */
authRouter.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, user } = await refreshAccessToken(token);

    res.status(200).json({
      accessToken,
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 */
authRouter.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...cookieOptions,
    maxAge: 0,
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

/**
 * GET /auth/me
 */
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user,
  });
});
