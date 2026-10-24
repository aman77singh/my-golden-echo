import webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscription, IPushSubscriptionDoc } from "../models/PushSubscription.js";
import { User, IUserDoc } from "../models/User.js";
import { logger } from "../logger.js";

// Initialize VAPID details if configured
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:support@ourspace.local",
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  logger.info("VAPID details configured successfully for Web Push.");
} else {
  logger.warn("VAPID keys not configured. Web push notifications will be simulated.");
}

export type NotificationCategory = "messages" | "progress" | "thoughts" | "cycle" | "reminders";

export interface PushNotificationPayload {
  title: string;
  body: string;
  category?: NotificationCategory;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

export interface PushDeliveryResult {
  sent: number;
  pruned: number;
  failed?: number;
  skipped?: string;
  simulated?: boolean;
}

/**
 * Check if the user is currently within their configured quiet hours in their local timezone.
 */
export function isUserInQuietHours(user: IUserDoc): boolean {
  if (!user.quietHours?.enabled) return false;
  const { start, end } = user.quietHours;
  if (!start || !end) return false;

  const tz = user.timezone || "Asia/Kolkata";
  let curH = 0;
  let curM = 0;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
    const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
    curH = parseInt(hourPart, 10);
    curM = parseInt(minutePart, 10);
  } catch {
    const now = new Date();
    curH = now.getUTCHours();
    curM = now.getUTCMinutes();
  }

  const curMinutes = curH * 60 + curM;
  const [startH, startM] = start.split(":").map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);

  const [endH, endM] = end.split(":").map(Number);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  } else {
    // Spans midnight (e.g. 22:00 to 08:00)
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  }
}

/**
 * Check if a specific notification category is allowed by user's preferences.
 */
export function isCategoryAllowed(user: IUserDoc, category?: NotificationCategory): boolean {
  if (!category) return true;
  if (!user.notificationPrefs) return true;
  const prefs = user.notificationPrefs as unknown as Record<string, boolean>;
  return prefs[category] !== false;
}

/**
 * Send a push notification to a specific user, respecting preferences and quiet hours.
 */
export async function sendToUser(
  targetUserId: string,
  payload: PushNotificationPayload,
  ignoreQuietHours: boolean = false
): Promise<PushDeliveryResult> {
  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return { sent: 0, pruned: 0, skipped: "user_not_found" };
    }

    // 1. Check category toggle
    if (payload.category && !isCategoryAllowed(targetUser, payload.category)) {
      logger.info({ userId: targetUserId, category: payload.category }, "Push skipped: category disabled in user preferences.");
      return { sent: 0, pruned: 0, skipped: "category_disabled" };
    }

    // 2. Check quiet hours
    if (!ignoreQuietHours && isUserInQuietHours(targetUser)) {
      logger.info({ userId: targetUserId, quietHours: targetUser.quietHours }, "Push skipped: user currently in quiet hours.");
      return { sent: 0, pruned: 0, skipped: "quiet_hours" };
    }

    // 3. Find user's subscriptions
    const subscriptions = await PushSubscription.find({ userId: targetUser._id });
    if (!subscriptions.length) {
      return { sent: 0, pruned: 0, skipped: "no_subscriptions" };
    }

    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      if (env.NODE_ENV === "production") {
        logger.error("Push delivery unavailable: VAPID keys are not configured in production.");
        return { sent: 0, pruned: 0, skipped: "vapid_not_configured" };
      }

      logger.info("Push delivery simulated because VAPID keys are not configured.");
      return { sent: subscriptions.length, pruned: 0, simulated: true };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/app",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-192.png",
      category: payload.category,
      tag: payload.tag,
      data: {
        url: payload.url || "/app",
        category: payload.category,
        ...payload.data,
      },
    });

    let sent = 0;
    let pruned = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSub = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          };

          await webpush.sendNotification(pushSub, payloadString, {
            TTL: 60 * 60 * 24, // 24 hours
          });
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            logger.info({ subId: sub._id, endpoint: sub.endpoint }, "Pruning expired or gone push subscription.");
            await PushSubscription.deleteOne({ _id: sub._id });
            pruned++;
          } else {
            failed++;
            logger.warn({ subId: sub._id, err: err?.message }, "Failed to send web push notification.");
          }
        }
      })
    );

    return { sent, pruned, failed };
  } catch (error: any) {
    logger.error({ err: error?.message, targetUserId }, "Error in sendToUser push delivery.");
    return { sent: 0, pruned: 0, skipped: "error" };
  }
}

/**
 * Send a push notification to the partner of the specified user.
 */
export async function sendToPartner(
  senderUserId: string,
  payload: PushNotificationPayload,
  ignoreQuietHours: boolean = false
): Promise<PushDeliveryResult> {
  try {
    const sender = await User.findById(senderUserId);
    if (!sender) {
      return { sent: 0, pruned: 0, skipped: "sender_not_found" };
    }

    const partner = await User.findOne({
      coupleId: sender.coupleId,
      _id: { $ne: sender._id },
    });

    if (!partner) {
      return { sent: 0, pruned: 0, skipped: "partner_not_found" };
    }

    return await sendToUser(partner._id.toString(), payload, ignoreQuietHours);
  } catch (error: any) {
    logger.error({ err: error?.message, senderUserId }, "Error in sendToPartner push delivery.");
    return { sent: 0, pruned: 0, skipped: "error" };
  }
}

/**
 * Register or update a push subscription for a user.
 */
export async function subscribeUser(
  userId: string,
  coupleId: string | undefined,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }
): Promise<IPushSubscriptionDoc> {
  const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
  if (existing) {
    existing.userId = userId as any;
    if (coupleId) existing.coupleId = coupleId as any;
    existing.keys = subscription.keys;
    await existing.save();
    return existing;
  }

  return await PushSubscription.create({
    userId,
    coupleId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });
}

/**
 * Unsubscribe / remove an endpoint.
 */
export async function unsubscribeUser(endpoint: string): Promise<boolean> {
  const result = await PushSubscription.deleteOne({ endpoint });
  return (result.deletedCount ?? 0) > 0;
}
