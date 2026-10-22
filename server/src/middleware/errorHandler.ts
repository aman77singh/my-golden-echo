import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../logger.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = err.message || "An unexpected error occurred.";

  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      coupleId: req.coupleId,
      statusCode,
    },
    `Error processing request: ${message}`
  );

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    res.status(409).json({
      error: "A record with these unique details already exists.",
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      error: "Invalid identifier format.",
    });
    return;
  }

  res.status(statusCode).json({
    error: message,
    ...(isAppError && err.details ? { details: err.details } : {}),
    ...(env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
