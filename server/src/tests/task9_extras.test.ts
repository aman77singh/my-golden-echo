import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import { User } from "../models/User.js";
import { Couple } from "../models/Couple.js";
import { generateAccessToken } from "../services/authService.js";

describe("TASK 9: Extras & Polish Backend Tests", () => {
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
    });

    userHim = await User.create({
      coupleId: coupleAId,
      name: "Aman",
      email: "aman@test.local",
      passwordHash: "hash123",
      role: "him",
      shareCycle: false,
    });

    herToken = generateAccessToken(userHer);
    himToken = generateAccessToken(userHim);
  });

  describe("1. Shared Calendar & Countdown Cards", () => {
    it("creates an event and retrieves it in calendar", async () => {
      const createRes = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${herToken}`)
        .send({
          title: "Our 2nd Anniversary Trip",
          description: "Flight to Manali 🏔️",
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          category: "trip",
          isCountdown: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.title).toBe("Our 2nd Anniversary Trip");

      const listRes = await request(app)
        .get("/events")
        .set("Authorization", `Bearer ${himToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.find((e: any) => e.title === "Our 2nd Anniversary Trip");
      expect(found).toBeDefined();
      expect(found.isCountdown).toBe(true);
    });
  });

  describe("2. Gratitude Jar", () => {
    it("adds gratitude and pulls a random note", async () => {
      await request(app)
        .post("/gratitude")
        .set("Authorization", `Bearer ${herToken}`)
        .send({ body: "Grateful for your warm hug this morning" });

      await request(app)
        .post("/gratitude")
        .set("Authorization", `Bearer ${himToken}`)
        .send({ body: "Grateful for your radiant smile" });

      const listRes = await request(app)
        .get("/gratitude")
        .set("Authorization", `Bearer ${herToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(2);

      const randomRes = await request(app)
        .get("/gratitude/random")
        .set("Authorization", `Bearer ${himToken}`);

      expect(randomRes.status).toBe(200);
      expect(randomRes.body).toHaveProperty("body");
    });
  });

  describe("3. Daily Conversation Starter", () => {
    it("conceals partner's answer until both have answered", async () => {
      // 1. Initial get: neither answered
      const initRes = await request(app)
        .get("/conversations/today")
        .set("Authorization", `Bearer ${herToken}`);

      expect(initRes.status).toBe(200);
      expect(initRes.body.bothAnswered).toBe(false);
      expect(initRes.body.myAnswer).toBeNull();
      expect(initRes.body.partnerAnswer).toBeNull();

      // 2. Her answers
      await request(app)
        .post("/conversations/today")
        .set("Authorization", `Bearer ${herToken}`)
        .send({ answer: "My secret answer about Paris" });

      // 3. Him queries: Her answer MUST BE CONCEALED!
      const himCheckRes = await request(app)
        .get("/conversations/today")
        .set("Authorization", `Bearer ${himToken}`);

      expect(himCheckRes.status).toBe(200);
      expect(himCheckRes.body.bothAnswered).toBe(false);
      expect(himCheckRes.body.partnerAnswered).toBe(true);
      expect(himCheckRes.body.partnerAnswer).toBeNull(); // CONCEALED!

      // 4. Him answers
      const himSubmitRes = await request(app)
        .post("/conversations/today")
        .set("Authorization", `Bearer ${himToken}`)
        .send({ answer: "My answer about quiet nights" });

      expect(himSubmitRes.status).toBe(200);
      expect(himSubmitRes.body.bothAnswered).toBe(true);
      expect(himSubmitRes.body.partnerAnswer).toBe("My secret answer about Paris"); // NOW REVEALED!

      // 5. Her queries again: both revealed
      const herFinalRes = await request(app)
        .get("/conversations/today")
        .set("Authorization", `Bearer ${herToken}`);

      expect(herFinalRes.body.bothAnswered).toBe(true);
      expect(herFinalRes.body.myAnswer).toBe("My secret answer about Paris");
      expect(herFinalRes.body.partnerAnswer).toBe("My answer about quiet nights");
    });
  });

  describe("4. Weekly Check-In", () => {
    it("submits weekly ratings and one thing to improve", async () => {
      const submitRes = await request(app)
        .post("/checkins")
        .set("Authorization", `Bearer ${herToken}`)
        .send({
          ratings: { communication: 5, intimacy: 4, fun: 5, support: 5 },
          highlight: "Our Sunday walk in the park",
          oneThingToImprove: "More evening time without phones",
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.ratings.communication).toBe(5);

      const listRes = await request(app)
        .get("/checkins")
        .set("Authorization", `Bearer ${himToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].oneThingToImprove).toBe("More evening time without phones");
    });
  });

  describe("5. Surprise Planner (Creator-Only Enforcement)", () => {
    it("hides surprises from partner (enforced in API)", async () => {
      // Her creates a surprise for Him
      const createRes = await request(app)
        .post("/surprises")
        .set("Authorization", `Bearer ${herToken}`)
        .send({
          title: "Surprise Candlelight Dinner on the Rooftop",
          notes: "Hide fairy lights and order his favorite Italian",
          budget: "$150",
        });

      expect(createRes.status).toBe(201);
      const surpriseId = createRes.body._id;

      // Her can see her own surprise
      const herList = await request(app)
        .get("/surprises")
        .set("Authorization", `Bearer ${herToken}`);

      expect(herList.status).toBe(200);
      expect(herList.body.length).toBe(1);

      // Him CANNOT see Her surprise! List MUST be empty
      const himList = await request(app)
        .get("/surprises")
        .set("Authorization", `Bearer ${himToken}`);

      expect(himList.status).toBe(200);
      expect(himList.body.length).toBe(0);

      // Him CANNOT update or delete Her surprise (403 Forbidden)
      const himPatch = await request(app)
        .patch(`/surprises/${surpriseId}`)
        .set("Authorization", `Bearer ${himToken}`)
        .send({ title: "Hacked!" });

      expect(himPatch.status).toBe(403);
    });
  });

  describe("6. Date Jar", () => {
    it("adds date idea, pulls random, and marks completed", async () => {
      const addRes = await request(app)
        .post("/dates")
        .set("Authorization", `Bearer ${herToken}`)
        .send({
          title: "Stargazing with hot chocolate",
          category: "outdoor",
          vibe: "romantic & cozy",
          estimatedCost: "free",
        });

      expect(addRes.status).toBe(201);
      const ideaId = addRes.body._id;

      const randomRes = await request(app)
        .get("/dates/random")
        .set("Authorization", `Bearer ${himToken}`);

      expect(randomRes.status).toBe(200);
      expect(randomRes.body.title).toBe("Stargazing with hot chocolate");

      const completeRes = await request(app)
        .patch(`/dates/${ideaId}/complete`)
        .set("Authorization", `Bearer ${himToken}`);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.completed).toBe(true);
    });
  });

  describe("7. JSON Data Export & Deletion", () => {
    it("GET /me/export downloads complete couple archive", async () => {
      const exportRes = await request(app)
        .get("/me/export")
        .set("Authorization", `Bearer ${herToken}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers["content-type"]).toContain("application/json");
      expect(exportRes.headers["content-disposition"]).toContain("attachment; filename=");
      expect(exportRes.body).toHaveProperty("exportedAt");
      expect(exportRes.body).toHaveProperty("user");
      expect(exportRes.body).toHaveProperty("partner");
      expect(exportRes.body).toHaveProperty("messages");
      expect(exportRes.body).toHaveProperty("events");
      expect(exportRes.body).toHaveProperty("gratitudes");
    });
  });
});
