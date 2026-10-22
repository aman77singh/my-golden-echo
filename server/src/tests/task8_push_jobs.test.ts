import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Couple } from "../models/Couple.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { Thought } from "../models/Thought.js";
import { ProgressPost } from "../models/ProgressPost.js";
import { Cycle } from "../models/Cycle.js";
import { generateAccessToken } from "../services/authService.js";
import { isUserInQuietHours, isCategoryAllowed } from "../services/pushService.js";
import { CronService, getDateInTimezone } from "../services/cronService.js";

describe("TASK 8: Web Push Notifications and Scheduled Jobs", () => {
  let mongoServer: MongoMemoryServer;
  let app: any;
  let coupleAId: mongoose.Types.ObjectId;
  let userHer: any;
  let userHim: any;
  let herToken: string;
  let himToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    const couple = await Couple.create({
      startDate: new Date("2024-01-01"),
    });
    coupleAId = couple._id as mongoose.Types.ObjectId;

    userHer = await User.create({
      coupleId: coupleAId,
      name: "Aditi",
      email: "aditi@test.local",
      passwordHash: "hash123",
      role: "her",
      shareCycle: true,
      timezone: "Asia/Kolkata",
      notificationPrefs: {
        messages: true,
        progress: true,
        thoughts: true,
        cycle: true,
        reminders: true,
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
      },
      reminders: {
        eveningProgressHour: 20,
      },
    });

    userHim = await User.create({
      coupleId: coupleAId,
      name: "Aman",
      email: "aman@test.local",
      passwordHash: "hash123",
      role: "him",
      shareCycle: false,
      timezone: "Asia/Kolkata",
      notificationPrefs: {
        messages: true,
        progress: true,
        thoughts: true,
        cycle: true,
        reminders: true,
      },
      quietHours: {
        enabled: false,
        start: "23:00",
        end: "07:00",
      },
      reminders: {
        eveningProgressHour: 21,
      },
    });

    herToken = generateAccessToken(userHer);
    himToken = generateAccessToken(userHim);
  });

  describe("1. VAPID Keys & Push Subscription Endpoints", () => {
    it("GET /push/vapid-key returns public VAPID key", async () => {
      const res = await request(app).get("/push/vapid-key");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("publicKey");
    });

    it("POST /push/subscribe registers a push subscription", async () => {
      const subscriptionData = {
        endpoint: "https://fcm.googleapis.com/fcm/send/test-sub-123",
        keys: {
          p256dh: "BMnRQHVMsxHnhb0AWbm4BjwKq89GOXpR2fYBOBpMveux",
          auth: "aXzKQMbQpV5ac2V3CE8Oig",
        },
      };

      const res = await request(app)
        .post("/push/subscribe")
        .set("Authorization", `Bearer ${herToken}`)
        .send(subscriptionData);

      expect(res.status).toBe(201);
      expect(res.body.subscription.endpoint).toBe(subscriptionData.endpoint);

      const dbSub = await PushSubscription.findOne({ endpoint: subscriptionData.endpoint });
      expect(dbSub).not.toBeNull();
      expect(dbSub!.userId.toString()).toBe(userHer._id.toString());
    });

    it("POST /push/unsubscribe removes subscription", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/test-sub-delete";
      await PushSubscription.create({
        userId: userHer._id,
        coupleId: coupleAId,
        endpoint,
        keys: { p256dh: "key", auth: "auth" },
      });

      const res = await request(app)
        .post("/push/unsubscribe")
        .set("Authorization", `Bearer ${herToken}`)
        .send({ endpoint });

      expect(res.status).toBe(200);
      const exists = await PushSubscription.findOne({ endpoint });
      expect(exists).toBeNull();
    });

    it("GET & PATCH /push/prefs manages notification preferences & quiet hours", async () => {
      const getRes = await request(app)
        .get("/push/prefs")
        .set("Authorization", `Bearer ${herToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.timezone).toBe("Asia/Kolkata");
      expect(getRes.body.notificationPrefs.messages).toBe(true);

      const patchRes = await request(app)
        .patch("/push/prefs")
        .set("Authorization", `Bearer ${herToken}`)
        .send({
          timezone: "Europe/London",
          notificationPrefs: {
            messages: false,
          },
          quietHours: {
            enabled: true,
            start: "23:00",
            end: "07:30",
          },
          reminders: {
            eveningProgressHour: 21,
          },
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.timezone).toBe("Europe/London");
      expect(patchRes.body.notificationPrefs.messages).toBe(false);
      expect(patchRes.body.notificationPrefs.progress).toBe(true); // preserved
      expect(patchRes.body.quietHours.enabled).toBe(true);
      expect(patchRes.body.quietHours.start).toBe("23:00");
      expect(patchRes.body.reminders.eveningProgressHour).toBe(21);
    });

    it("POST /push/test sends a test push notification", async () => {
      const res = await request(app)
        .post("/push/test")
        .set("Authorization", `Bearer ${herToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("result");
    });
  });

  describe("2. Quiet Hours and Notification Preferences Logic", () => {
    it("respects quiet hours when disabled vs enabled", () => {
      // Disabled
      expect(isUserInQuietHours(userHer)).toBe(false);

      // Enabled spanning midnight (e.g. 00:00 - 23:59 covers everything)
      userHer.quietHours = {
        enabled: true,
        start: "00:00",
        end: "23:59",
      };
      expect(isUserInQuietHours(userHer)).toBe(true);

      // Enabled in a window not currently active (e.g. 03:00 to 03:01 when now is different)
      // Check category preferences
      expect(isCategoryAllowed(userHer, "messages")).toBe(true);
      userHer.notificationPrefs.messages = false;
      expect(isCategoryAllowed(userHer, "messages")).toBe(false);
      expect(isCategoryAllowed(userHer, "progress")).toBe(true);
    });
  });

  describe("3. Scheduled Jobs & /jobs/tick Endpoint", () => {
    it("GET /jobs/tick rejects request without valid secret header", async () => {
      const res = await request(app).get("/jobs/tick");
      expect(res.status).toBe(401);
    });

    it("GET /jobs/tick executes all due jobs with X-Jobs-Secret header", async () => {
      const res = await request(app)
        .get("/jobs/tick")
        .set("X-Jobs-Secret", "our_space_cron_secret_tick_2026");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveProperty("eveningReminders");
      expect(res.body.results).toHaveProperty("periodAlerts");
      expect(res.body.results).toHaveProperty("sundaySummaries");
      expect(res.body.results).toHaveProperty("insecurityCheckIns");
    });

    it("idempotency: Insecurity check-in nudges run only once after 3 days", async () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const insecurity = await Thought.create({
        coupleId: coupleAId,
        userId: userHer._id,
        body: "I felt a bit insecure about our plans",
        kind: "insecurity",
        visibility: "shared",
        createdAt: fourDaysAgo,
      });

      // First run: should process
      const count1 = await CronService.runInsecurityCheckIns();
      expect(count1).toBe(1);

      const updated = await Thought.findById(insecurity._id);
      expect(updated!.checkInSentAt).toBeDefined();

      // Second run: should be idempotent and process 0
      const count2 = await CronService.runInsecurityCheckIns();
      expect(count2).toBe(0);
    });
  });
});
