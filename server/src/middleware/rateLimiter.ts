import rateLimit from "express-rate-limit";

// General rate limiter for API endpoints (e.g., 300 requests per 15 minutes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

// Stricter rate limiter for authentication endpoints (e.g., 10 attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  skip: () => process.env.NODE_ENV === "test",
});
