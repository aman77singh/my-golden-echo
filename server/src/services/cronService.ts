import { User, IUserDoc } from "../models/User.js";
import { Couple } from "../models/Couple.js";
import { Cycle } from "../models/Cycle.js";
import { ProgressPost } from "../models/ProgressPost.js";
import { sendToUser } from "./pushService.js";
import { ThoughtService } from "./thoughtService.js";
import { logger } from "../logger.js";

/**
 * Format a Date into YYYY-MM-DD string in a specified timezone.
 */
export function getDateInTimezone(date: Date, timezone: string = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Get current hour (0-23) in a specified timezone.
 */
export function getHourInTimezone(date: Date, timezone: string = "Asia/Kolkata"): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hourVal = parts.find((p) => p.type === "hour")?.value || "0";
    return parseInt(hourVal, 10);
  } catch {
    return date.getUTCHours();
  }
}

/**
 * Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday) in a specified timezone.
 */
export function getDayOfWeekInTimezone(date: Date, timezone: string = "Asia/Kolkata"): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayStr = formatter.format(date); // Sun, Mon, Tue, etc.
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[dayStr] ?? date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}

export class CronService {
  /**
   * 1. Evening reminder if user hasn't posted progress by their chosen time.
   * Idempotent: checks user.reminders.lastEveningReminderAt against today's date in user's timezone.
   */
  static async runEveningProgressReminders(): Promise<number> {
    const now = new Date();
    const users = await User.find();
    let sentCount = 0;

    for (const user of users) {
      try {
        const tz = user.timezone || "Asia/Kolkata";
        const todayStr = getDateInTimezone(now, tz);
        const curHour = getHourInTimezone(now, tz);
        const targetHour = user.reminders?.eveningProgressHour ?? 20;

        // Has the chosen evening time arrived yet?
        if (curHour < targetHour) {
          continue;
        }

        // Idempotency: Check if reminder was already sent today
        if (user.reminders?.lastEveningReminderAt) {
          const lastSentDateStr = getDateInTimezone(new Date(user.reminders.lastEveningReminderAt), tz);
          if (lastSentDateStr === todayStr) {
            continue;
          }
        }

        // Check if category notifications are allowed
        if (user.notificationPrefs && user.notificationPrefs.reminders === false) {
          continue;
        }

        // Check if user already posted progress today
        // Start of today in user's timezone (approximated as midnight UTC of the local date or query recent posts)
        const recentPosts = await ProgressPost.find({
          coupleId: user.coupleId,
          userId: user._id,
        })
          .sort({ createdAt: -1 })
          .limit(10);

        const hasPostedToday = recentPosts.some((p) => {
          const postDateStr = getDateInTimezone(new Date(p.createdAt), tz);
          return postDateStr === todayStr;
        });

        if (hasPostedToday) {
          continue;
        }

        // User hasn't posted and it's evening! Send reminder
        const res = await sendToUser(
          user._id.toString(),
          {
            title: "Evening check-in 🌱",
            body: "How did your day go? Take a moment to log your wins or struggles together.",
            category: "reminders",
            url: "/app/progress",
          }
        );

        if (res.sent > 0 || res.skipped === "no_subscriptions") {
          user.reminders = {
            ...(user.reminders || { eveningProgressHour: 20 }),
            lastEveningReminderAt: now,
          };
          await user.save();
          sentCount++;
        }
      } catch (err: any) {
        logger.error({ userId: user._id, err: err?.message }, "Error in runEveningProgressReminders.");
      }
    }

    return sentCount;
  }

  /**
   * 2. Period alert 2 days ahead (to her, and to him only if shareCycle).
   * Idempotent: checks user.reminders.lastPeriodAlertAt so it never sends twice per cycle.
   */
  static async runPeriodAlerts(): Promise<number> {
    const now = new Date();
    // Find all female users
    const women = await User.find({ role: "her" });
    let sentCount = 0;

    for (const woman of women) {
      try {
        const tz = woman.timezone || "Asia/Kolkata";
        const todayStr = getDateInTimezone(now, tz);

        // Fetch recent completed cycles to estimate cycle length
        const cycles = await Cycle.find({ userId: woman._id }).sort({ startDate: -1 }).limit(6);
        if (!cycles.length) continue;

        const latest = cycles[0];
        const latestStart = new Date(latest.startDate);

        // Simple average cycle length (default 28)
        let avgLength = 28;
        if (cycles.length >= 2) {
          const lengths: number[] = [];
          for (let i = 0; i < cycles.length - 1; i++) {
            const cur = new Date(cycles[i].startDate);
            const prev = new Date(cycles[i + 1].startDate);
            const diffDays = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 18 && diffDays <= 50) lengths.push(diffDays);
          }
          if (lengths.length > 0) {
            avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
          }
        }

        const predictedNextStart = new Date(latestStart.getTime() + avgLength * 24 * 60 * 60 * 1000);
        const daysUntil = Math.round((predictedNextStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check if 2 days ahead
        if (daysUntil === 2) {
          // Idempotency check: don't send if already alerted within the last 15 days
          if (woman.reminders?.lastPeriodAlertAt) {
            const diffSinceLast = Math.round(
              (now.getTime() - new Date(woman.reminders.lastPeriodAlertAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffSinceLast < 15) {
              continue;
            }
          }

          // Send to her
          await sendToUser(woman._id.toString(), {
            title: "Period predicted in ~2 days 🌸",
            body: "Take it easy, hydrate well, and prepare your comfort essentials.",
            category: "cycle",
            url: "/app/cycle",
          });

          // Send to partner only if shareCycle is true
          if (woman.shareCycle) {
            const partner = await User.findOne({
              coupleId: woman.coupleId,
              _id: { $ne: woman._id },
            });

            if (partner) {
              await sendToUser(partner._id.toString(), {
                title: "Gentle heads up 🌸",
                body: `${woman.name}'s period is expected in ~2 days. Extra warmth, patience, and snacks ready!`,
                category: "cycle",
                url: "/app/cycle",
              });
            }
          }

          woman.reminders = {
            ...(woman.reminders || { eveningProgressHour: 20 }),
            lastPeriodAlertAt: now,
          };
          await woman.save();
          sentCount++;
        }
      } catch (err: any) {
        logger.error({ womanId: woman._id, err: err?.message }, "Error in runPeriodAlerts.");
      }
    }

    return sentCount;
  }

  /**
   * 3. Sunday weekly summary notification.
   * Idempotent: checks user.reminders.lastSundaySummaryAt against today's date.
   */
  static async runSundayWeeklySummary(): Promise<number> {
    const now = new Date();
    const users = await User.find();
    let sentCount = 0;

    for (const user of users) {
      try {
        const tz = user.timezone || "Asia/Kolkata";
        const dayOfWeek = getDayOfWeekInTimezone(now, tz);
        const curHour = getHourInTimezone(now, tz);
        const todayStr = getDateInTimezone(now, tz);

        // Run on Sunday (0) after 17:00
        if (dayOfWeek !== 0 || curHour < 17) {
          continue;
        }

        // Idempotency: check if sent on this Sunday
        if (user.reminders?.lastSundaySummaryAt) {
          const lastDateStr = getDateInTimezone(new Date(user.reminders.lastSundaySummaryAt), tz);
          if (lastDateStr === todayStr) {
            continue;
          }
        }

        if (user.notificationPrefs && user.notificationPrefs.reminders === false) {
          continue;
        }

        const res = await sendToUser(user._id.toString(), {
          title: "Sunday Weekly Wrap 🌟",
          body: "Your weekly progress summary is ready! Take a moment to celebrate together.",
          category: "progress",
          url: "/app/progress",
        });

        if (res.sent > 0 || res.skipped === "no_subscriptions") {
          user.reminders = {
            ...(user.reminders || { eveningProgressHour: 20 }),
            lastSundaySummaryAt: now,
          };
          await user.save();
          sentCount++;
        }
      } catch (err: any) {
        logger.error({ userId: user._id, err: err?.message }, "Error in runSundayWeeklySummary.");
      }
    }

    return sentCount;
  }

  /**
   * 4. Insecurity check-in nudge after 3 days.
   * Idempotent: uses checkInSentAt on Thought document.
   */
  static async runInsecurityCheckIns(): Promise<number> {
    return await ThoughtService.runInsecurityCheckIns();
  }

  /**
   * Run all scheduled jobs (used by internal cron or external /jobs/tick).
   */
  static async runAllDueJobs(): Promise<{
    eveningReminders: number;
    periodAlerts: number;
    sundaySummaries: number;
    insecurityCheckIns: number;
  }> {
    const [eveningReminders, periodAlerts, sundaySummaries, insecurityCheckIns] =
      await Promise.all([
        this.runEveningProgressReminders(),
        this.runPeriodAlerts(),
        this.runSundayWeeklySummary(),
        this.runInsecurityCheckIns(),
      ]);

    logger.info(
      { eveningReminders, periodAlerts, sundaySummaries, insecurityCheckIns },
      "Cron jobs executed successfully."
    );

    return {
      eveningReminders,
      periodAlerts,
      sundaySummaries,
      insecurityCheckIns,
    };
  }
}
