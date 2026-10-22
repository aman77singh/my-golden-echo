import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import {
  subscribeUser,
  unsubscribeUser,
  sendToUser,
  sendToPartner,
} from "../services/pushService.js";
import { NotFoundError } from "../utils/errors.js";

export const pushRouter = Router();

/**
 * GET /push/vapid-key
 * Returns the public VAPID key for web push subscription.
 */
pushRouter.get("/vapid-key", (_req: Request, res: Response) => {
  res.status(200).json({
    publicKey: env.VAPID_PUBLIC_KEY || "",
  });
});

// All following routes require authentication
pushRouter.use(requireAuth);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /push/subscribe
 * Register a web push subscription for the logged-in user.
 */
pushRouter.post(
  "/subscribe",
  validateBody(subscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await subscribeUser(
        req.user!.id,
        req.user!.coupleId,
        req.body
      );

      res.status(201).json({
        message: "Push subscription registered successfully.",
        subscription: sub,
      });
    } catch (error) {
      next(error);
    }
  }
);

const unsubscribeSchema = z.object({
  endpoint: z.string(),
});

/**
 * POST /push/unsubscribe
 * Remove a web push subscription.
 */
pushRouter.post(
  "/unsubscribe",
  validateBody(unsubscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await unsubscribeUser(req.body.endpoint);
      res.status(200).json({
        message: "Push subscription removed successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /push/prefs
 * Get notification preferences, quiet hours, and timezone for current user.
 */
pushRouter.get("/prefs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw new NotFoundError("User not found.");

    res.status(200).json({
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
    });
  } catch (error) {
    next(error);
  }
});

const updatePrefsSchema = z.object({
  timezone: z.string().optional(),
  notificationPrefs: z
    .object({
      messages: z.boolean().optional(),
      progress: z.boolean().optional(),
      thoughts: z.boolean().optional(),
      cycle: z.boolean().optional(),
      reminders: z.boolean().optional(),
    })
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })
    .optional(),
  reminders: z
    .object({
      eveningProgressHour: z.number().min(0).max(23).optional(),
    })
    .optional(),
});

/**
 * PATCH /push/prefs
 * Update notification preferences and quiet hours for current user.
 */
pushRouter.patch(
  "/prefs",
  validateBody(updatePrefsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new NotFoundError("User not found.");

      if (req.body.timezone) {
        user.timezone = req.body.timezone;
      }
      if (req.body.notificationPrefs) {
        user.notificationPrefs = {
          ...user.notificationPrefs,
          ...req.body.notificationPrefs,
        };
      }
      if (req.body.quietHours) {
        user.quietHours = {
          ...user.quietHours,
          ...req.body.quietHours,
        };
      }
      if (req.body.reminders) {
        user.reminders = {
          ...user.reminders,
          ...req.body.reminders,
        };
      }

      await user.save();

      res.status(200).json({
        message: "Preferences updated successfully.",
        timezone: user.timezone,
        notificationPrefs: user.notificationPrefs,
        quietHours: user.quietHours,
        reminders: user.reminders,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /push/test
 * Send a test push notification to the calling user.
 */
pushRouter.post("/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sendToUser(
      req.user!.id,
      {
        title: "Our Space Notification Test ✨",
        body: "Your notifications are working beautifully!",
        category: "reminders",
        url: "/app",
      },
      true // ignore quiet hours for explicit test
    );

    res.status(200).json({
      message: "Test push attempted.",
      result,
    });
  } catch (error) {
    next(error);
  }
});
