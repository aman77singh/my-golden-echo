import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcrypt";
import { createApp } from "../app.js";
import { Couple } from "../models/Couple.js";
import { User } from "../models/User.js";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

// Couple A tokens & IDs
let coupleAId: string;
let userA1Id: string; // Her
let tokenA1: string;
let userA2Id: string; // Him
let tokenA2: string;
let refreshCookieA1: string;

// Couple B tokens & IDs
let coupleBId: string;
let userB1Id: string; // Her
let tokenB1: string;
let userB2Id: string; // Him
let tokenB2: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = createApp();

  const passwordHash = await bcrypt.hash("TestPass123!", 12);

  // 1. Create Couple A
  const coupleA = await Couple.create({ startDate: new Date("2024-01-01") });
  coupleAId = coupleA._id.toString();

  const userA1 = await User.create({
    coupleId: coupleA._id,
    name: "Alice",
    email: "alice@couple-a.local",
    passwordHash,
    role: "her",
    shareCycle: false,
    cycleSharingPreferenceConfigured: true,
  });
  userA1Id = userA1._id.toString();

  const userA2 = await User.create({
    coupleId: coupleA._id,
    name: "Alex",
    email: "alex@couple-a.local",
    passwordHash,
    role: "him",
    shareCycle: false,
    cycleSharingPreferenceConfigured: true,
  });
  userA2Id = userA2._id.toString();

  // 2. Create Couple B
  const coupleB = await Couple.create({ startDate: new Date("2024-06-01") });
  coupleBId = coupleB._id.toString();

  const userB1 = await User.create({
    coupleId: coupleB._id,
    name: "Bella",
    email: "bella@couple-b.local",
    passwordHash,
    role: "her",
    shareCycle: false,
    cycleSharingPreferenceConfigured: true,
  });
  userB1Id = userB1._id.toString();

  const userB2 = await User.create({
    coupleId: coupleB._id,
    name: "Ben",
    email: "ben@couple-b.local",
    passwordHash,
    role: "him",
    shareCycle: false,
    cycleSharingPreferenceConfigured: true,
  });
  userB2Id = userB2._id.toString();

  // Log in Alice (Couple A - Her)
  const resA1 = await request(app)
    .post("/auth/login")
    .send({ email: "alice@couple-a.local", password: "TestPass123!" });
  expect(resA1.status).toBe(200);
  tokenA1 = resA1.body.accessToken;
  const cookieHeader = resA1.headers["set-cookie"];
  refreshCookieA1 = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader || "";

  // Log in Alex (Couple A - Him)
  const resA2 = await request(app)
    .post("/auth/login")
    .send({ email: "alex@couple-a.local", password: "TestPass123!" });
  expect(resA2.status).toBe(200);
  tokenA2 = resA2.body.accessToken;

  // Log in Bella (Couple B - Her)
  const resB1 = await request(app)
    .post("/auth/login")
    .send({ email: "bella@couple-b.local", password: "TestPass123!" });
  expect(resB1.status).toBe(200);
  tokenB1 = resB1.body.accessToken;

  // Log in Ben (Couple B - Him)
  const resB2 = await request(app)
    .post("/auth/login")
    .send({ email: "ben@couple-b.local", password: "TestPass123!" });
  expect(resB2.status).toBe(200);
  tokenB2 = resB2.body.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("1. Health Endpoint", () => {
  it("GET /health returns 200 OK with healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/health also returns 200 OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("2. Authentication & JWT / Cookie Handling", () => {
  it("POST /auth/login returns accessToken in body and sets httpOnly refresh cookie", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@couple-a.local", password: "TestPass123!" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("alice@couple-a.local");
    expect(res.body.user.role).toBe("her");

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toContain("refreshToken=");
    expect(cookieStr.toLowerCase()).toContain("httponly");
  });

  it("POST /auth/login rejects invalid credentials with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@couple-a.local", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("POST /auth/refresh exchanges refresh cookie for a new accessToken", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookieA1);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("alice@couple-a.local");
  });

  it("POST /auth/logout clears the refresh cookie", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieStr).toContain("refreshToken=;");
  });

  it("Protected routes reject requests without a valid Bearer token with 401", async () => {
    const res = await request(app).get("/thoughts");
    expect(res.status).toBe(401);
  });
});

describe("3. Multi-Tenant Couple Isolation", () => {
  let coupleAThoughtId: string;
  let coupleAPostId: string;
  let coupleAMessageId: string;

  beforeAll(async () => {
    // Alice (Couple A) creates a thought
    const thoughtRes = await request(app)
      .post("/thoughts")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "Secret Couple A thought", kind: "thought", visibility: "shared" });
    coupleAThoughtId = thoughtRes.body._id;

    // Alice creates a progress post
    const postRes = await request(app)
      .post("/progress")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ category: "fitness", body: "Ran 5k for Couple A", mediaUrls: [] });
    coupleAPostId = postRes.body._id;

    // Alice creates a message
    const msgRes = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "Hello Alex from Couple A" });
    coupleAMessageId = msgRes.body._id;
  });

  it("User from Couple B cannot see Couple A thoughts in list", async () => {
    const res = await request(app)
      .get("/thoughts")
      .set("Authorization", `Bearer ${tokenB1}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((t: any) => t._id);
    expect(ids).not.toContain(coupleAThoughtId);
  });

  it("User from Couple B cannot access Couple A thought by ID", async () => {
    const res = await request(app)
      .get(`/thoughts/${coupleAThoughtId}`)
      .set("Authorization", `Bearer ${tokenB1}`);

    expect([403, 404]).toContain(res.status);
  });

  it("User from Couple B cannot see Couple A progress posts", async () => {
    const res = await request(app)
      .get("/progress")
      .set("Authorization", `Bearer ${tokenB1}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((p: any) => p._id);
    expect(ids).not.toContain(coupleAPostId);
  });

  it("User from Couple B cannot delete or modify Couple A progress post", async () => {
    const res = await request(app)
      .delete(`/progress/${coupleAPostId}`)
      .set("Authorization", `Bearer ${tokenB1}`);

    expect([403, 404]).toContain(res.status);
  });

  it("User from Couple B cannot see Couple A messages", async () => {
    const res = await request(app)
      .get("/messages")
      .set("Authorization", `Bearer ${tokenB1}`);

    expect(res.status).toBe(200);
    const ids = res.body.map((m: any) => m._id);
    expect(ids).not.toContain(coupleAMessageId);
  });

  it("User from Couple B cannot delete Couple A message", async () => {
    const res = await request(app)
      .delete(`/messages/${coupleAMessageId}`)
      .set("Authorization", `Bearer ${tokenB1}`);

    expect([403, 404]).toContain(res.status);
  });
});

describe("4. Thought & Insecurity Authorization Rules", () => {
  let privateThoughtId: string;
  let sharedInsecurityId: string;

  it("Author (Alice) creates a private thought; Partner (Alex) CANNOT see it in list", async () => {
    const createRes = await request(app)
      .post("/thoughts")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        body: "My private journal thought",
        kind: "thought",
        visibility: "private",
      });

    expect(createRes.status).toBe(201);
    privateThoughtId = createRes.body._id;

    // Alice can see it
    const aliceList = await request(app)
      .get("/thoughts")
      .set("Authorization", `Bearer ${tokenA1}`);
    expect(aliceList.body.map((t: any) => t._id)).toContain(privateThoughtId);

    // Alex (Partner) CANNOT see it in list
    const alexList = await request(app)
      .get("/thoughts")
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(alexList.body.map((t: any) => t._id)).not.toContain(privateThoughtId);
  });

  it("Partner (Alex) CANNOT access Alice's private thought by direct ID (403 Forbidden)", async () => {
    const res = await request(app)
      .get(`/thoughts/${privateThoughtId}`)
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("private");
  });

  it("Insecurity without visibility defaults to private and partner cannot read it", async () => {
    const createRes = await request(app)
      .post("/thoughts")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        body: "I am feeling insecure today",
        kind: "insecurity",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.visibility).toBe("private");

    // Partner cannot read it
    const res = await request(app)
      .get(`/thoughts/${createRes.body._id}`)
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(res.status).toBe(403);
  });

  it("Author CANNOT respond to their own thought (403 Forbidden)", async () => {
    const createShared = await request(app)
      .post("/thoughts")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        body: "Shared vulnerability",
        kind: "insecurity",
        visibility: "shared",
      });
    sharedInsecurityId = createShared.body._id;

    const res = await request(app)
      .post(`/thoughts/${sharedInsecurityId}/responses`)
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ emoji: "❤️", note: "Author responding to self" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("own thought");
  });

  it("Insecurity response note is limited to 200 characters (400 Bad Request if exceeded)", async () => {
    const longNote = "a".repeat(201);
    const res = await request(app)
      .post(`/thoughts/${sharedInsecurityId}/responses`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "💖", note: longNote });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("200 characters");
  });

  it("Partner can respond to shared insecurity with valid note and emoji", async () => {
    const res = await request(app)
      .post(`/thoughts/${sharedInsecurityId}/responses`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "💖", note: "I love you and I am here for you." });

    expect([200, 201]).toContain(res.status);
    expect(res.body.responses.length).toBeGreaterThan(0);
    const lastResponse = res.body.responses[res.body.responses.length - 1];
    expect(lastResponse.emoji).toBe("💖");
    expect(lastResponse.note).toBe("I love you and I am here for you.");
  });
});

describe("5. Cycle & SymptomLog Privacy Rules (shareCycle)", () => {
  let cycleRecordId: string;

  it("Owner (Alice) logs cycle and symptoms when shareCycle is false", async () => {
    // Alice creates cycle record
    const cycleRes = await request(app)
      .post("/cycles")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        startDate: "2025-03-01",
        flow: "medium",
        notes: "Cycle began",
      });

    expect(cycleRes.status).toBe(201);
    cycleRecordId = cycleRes.body._id;

    // Alice logs symptoms
    const symRes = await request(app)
      .post("/cycles/symptoms")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        date: "2025-03-01",
        symptoms: ["cramps", "fatigue"],
        pain: 6,
        mood: "sensitive",
      });

    expect([200, 201]).toContain(symRes.status);
  });

  it("Partner (Alex) CANNOT read cycle records when shareCycle is false (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/cycles")
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not shared cycle data");
  });

  it("Partner (Alex) CANNOT read symptom logs when shareCycle is false (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/cycles/symptoms")
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not shared cycle data");
  });

  it("Partner (Alex) CANNOT create, update or delete cycle records (403 Forbidden)", async () => {
    // Alex attempts to create cycle record
    const createRes = await request(app)
      .post("/cycles")
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ startDate: "2025-03-02" });
    expect(createRes.status).toBe(403);

    // Alex attempts to delete Alice's cycle record
    const delRes = await request(app)
      .delete(`/cycles/${cycleRecordId}`)
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(delRes.status).toBe(403);
  });

  it("When Alice enables shareCycle (true) via PATCH /me/privacy, Partner (Alex) CAN read cycle and symptom data", async () => {
    // Enable shareCycle for Alice via PATCH /me/privacy
    const patchRes = await request(app)
      .patch("/me/privacy")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ shareCycle: true });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.user.shareCycle).toBe(true);

    // Alex reads cycle records
    const cycleRes = await request(app)
      .get("/cycles")
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(cycleRes.status).toBe(200);
    expect(cycleRes.body.length).toBeGreaterThan(0);
    expect(cycleRes.body[0].notes).toBe("Cycle began");

    // Alex reads symptoms
    const symRes = await request(app)
      .get("/cycles/symptoms")
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(symRes.status).toBe(200);
    expect(symRes.body.length).toBeGreaterThan(0);
    expect(symRes.body[0].symptoms).toContain("cramps");
  });

  it("automatically shares cycle data once and preserves an explicit privacy opt-out", async () => {
    const couple = await Couple.create({ startDate: new Date("2025-01-01") });
    const aditi = await User.create({
      coupleId: couple._id,
      name: "Aditi",
      email: "aditi@cycle-sharing.local",
      passwordHash: await bcrypt.hash("TestPass123!", 12),
      role: "her",
      shareCycle: false,
    });
    await User.create({
      coupleId: couple._id,
      name: "Aman",
      email: "aman@cycle-sharing.local",
      passwordHash: await bcrypt.hash("TestPass123!", 12),
      role: "him",
      shareCycle: false,
      cycleSharingPreferenceConfigured: true,
    });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "aditi@cycle-sharing.local", password: "TestPass123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.shareCycle).toBe(true);

    const token = loginRes.body.accessToken;
    await User.updateOne(
      { email: "aditi@cycle-sharing.local" },
      { $set: { shareCycle: false, cycleSharingPreferenceConfigured: false } }
    );
    const existingSessionRes = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);
    expect(existingSessionRes.status).toBe(200);
    expect(existingSessionRes.body.shareCycle).toBe(true);

    await User.updateOne(
      { _id: aditi._id },
      { $set: { shareCycle: false, cycleSharingPreferenceConfigured: false } }
    );
    const partnerLoginRes = await request(app)
      .post("/auth/login")
      .send({ email: "aman@cycle-sharing.local", password: "TestPass123!" });
    const coupleRes = await request(app)
      .get("/couple")
      .set("Authorization", `Bearer ${partnerLoginRes.body.accessToken}`);
    expect(coupleRes.status).toBe(200);
    expect(coupleRes.body.partner.shareCycle).toBe(true);

    const disableRes = await request(app)
      .patch("/me/privacy")
      .set("Authorization", `Bearer ${token}`)
      .send({ shareCycle: false });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.user.shareCycle).toBe(false);

    const profileRes = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.shareCycle).toBe(false);
  });
});

describe("6. ProgressPost & Reply Rules", () => {
  let postId: string;
  let replyId: string;

  it("Author (Alice) creates progress post; Partner cannot edit or delete it", async () => {
    const createRes = await request(app)
      .post("/progress")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        category: "mindfulness",
        body: "Meditated for 20 minutes",
        minutes: 20,
        mediaUrls: [],
      });

    expect(createRes.status).toBe(201);
    postId = createRes.body._id;

    // Partner (Alex) attempts to edit -> 403 Forbidden
    const editRes = await request(app)
      .patch(`/progress/${postId}`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ body: "Tampered body" });
    expect(editRes.status).toBe(403);

    // Partner (Alex) attempts to delete -> 403 Forbidden
    const delRes = await request(app)
      .delete(`/progress/${postId}`)
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(delRes.status).toBe(403);
  });

  it("Partner (Alex) can add reply and reaction to post", async () => {
    // Alex adds reply
    const replyRes = await request(app)
      .post(`/progress/${postId}/replies`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ body: "Proud of you!", quickCheer: "👏" });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.replies.length).toBe(1);
    replyId = replyRes.body.replies[0]._id;

    // Alex adds reaction
    const reactRes = await request(app)
      .post(`/progress/${postId}/reactions`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "✨" });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.reactions.some((r: any) => r.emoji === "✨")).toBe(true);
  });

  it("Author (Alice) CANNOT delete Alex's reply (403 Forbidden)", async () => {
    const res = await request(app)
      .delete(`/progress/${postId}/replies/${replyId}`)
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(403);
  });

  it("Alex can delete his own reply", async () => {
    const res = await request(app)
      .delete(`/progress/${postId}/replies/${replyId}`)
      .set("Authorization", `Bearer ${tokenA2}`);

    expect(res.status).toBe(200);
    expect(res.body.replies.length).toBe(0);
  });

  it("Goal CRUD: create goal, increment count on progress post, and calculate weekly summary", async () => {
    // 1. Create a goal
    const goalRes = await request(app)
      .post("/goals")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        title: "Read Physics Textbook",
        category: "Study",
        targetCount: 10,
        unit: "chapters",
        deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
      });

    expect(goalRes.status).toBe(201);
    expect(goalRes.body.currentCount).toBe(0);
    const goalId = goalRes.body._id;

    // 2. Both partners can list goals
    const goalsList = await request(app)
      .get("/goals")
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(goalsList.status).toBe(200);
    expect(goalsList.body.some((g: any) => g._id === goalId)).toBe(true);

    // 3. Post progress with goalId increments currentCount by countAdded
    const postWithGoal = await request(app)
      .post("/progress")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({
        goalId,
        category: "Study",
        body: "Finished chapter 1 & 2 of physics!",
        countAdded: 2,
        minutes: 60,
        struggled: false,
      });
    expect(postWithGoal.status).toBe(201);

    // Verify goal currentCount was incremented
    const updatedGoal = await request(app)
      .get(`/goals/${goalId}`)
      .set("Authorization", `Bearer ${tokenA1}`);
    expect(updatedGoal.status).toBe(200);
    expect(updatedGoal.body.currentCount).toBe(2);

    // 4. Partner can react using /react
    const reactRes = await request(app)
      .post(`/progress/${postWithGoal.body._id}/react`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "🔥" });
    expect(reactRes.status).toBe(200);

    // 5. GET /progress/summary/weekly returns stats
    const summaryRes = await request(app)
      .get("/progress/summary/weekly")
      .set("Authorization", `Bearer ${tokenA1}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.daysPosted).toBeGreaterThanOrEqual(1);
    expect(summaryRes.body.totalCount).toBeGreaterThanOrEqual(2);
    expect(summaryRes.body.cheersReceived).toBeGreaterThanOrEqual(1);
  });
});

describe("7. Message Authorization Rules", () => {
  let messageId: string;

  it("Both partners can read couple messages; only sender can delete", async () => {
    // Alice sends a message
    const sendRes = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "I miss you ❤️" });

    expect(sendRes.status).toBe(201);
    messageId = sendRes.body._id;

    // Alex can read it
    const alexRead = await request(app)
      .get("/messages")
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(alexRead.status).toBe(200);
    expect(alexRead.body.some((m: any) => m._id === messageId)).toBe(true);

    // Alex attempts to delete Alice's message -> 403 Forbidden
    const alexDel = await request(app)
      .delete(`/messages/${messageId}`)
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(alexDel.status).toBe(403);

    // Alice deletes her own message -> 200 OK
    const aliceDel = await request(app)
      .delete(`/messages/${messageId}`)
      .set("Authorization", `Bearer ${tokenA1}`);
    expect(aliceDel.status).toBe(200);
  });

  it("POST /messages/:id/react toggles emoji reactions", async () => {
    const msgRes = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "Good morning sunshine!" });
    expect(msgRes.status).toBe(201);
    const mid = msgRes.body._id;

    // Partner Alex reacts with heart emoji
    const reactRes = await request(app)
      .post(`/messages/${mid}/react`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "❤️" });
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.reactions).toHaveLength(1);
    expect(reactRes.body.reactions[0].emoji).toBe("❤️");

    // Partner Alex reacts again with same emoji -> toggles off
    const unreactRes = await request(app)
      .post(`/messages/${mid}/react`)
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "❤️" });
    expect(unreactRes.status).toBe(200);
    expect(unreactRes.body.reactions).toHaveLength(0);
  });

  it("POST /messages/seen marks partner's messages as seen", async () => {
    const msgRes = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "Have you arrived yet?" });
    expect(msgRes.status).toBe(201);

    const seenRes = await request(app)
      .post("/messages/seen")
      .set("Authorization", `Bearer ${tokenA2}`);
    expect(seenRes.status).toBe(200);
    expect(seenRes.body.success).toBe(true);
  });

  it("POST /messages supports replyTo and GET /messages supports limit and before", async () => {
    const orig = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "What time is dinner?" });
    expect(orig.status).toBe(201);

    const reply = await request(app)
      .post("/messages")
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ body: "7:30 PM at the rooftop", replyTo: orig.body._id });
    expect(reply.status).toBe(201);
    expect(reply.body.replyTo).toBeDefined();

    const paginated = await request(app)
      .get("/messages?limit=10")
      .set("Authorization", `Bearer ${tokenA1}`);
    expect(paginated.status).toBe(200);
    expect(Array.isArray(paginated.body)).toBe(true);
  });
});

describe("8. Cloudinary Signed Upload & Voice Upload", () => {
  it("POST /media/sign generates upload signature for authenticated user", async () => {
    const res = await request(app)
      .post("/media/sign")
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(200);
    expect(res.body.signature).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.apiKey).toBeDefined();
    expect(res.body.cloudName).toBeDefined();
    expect(res.body.folder).toContain(`couples/${coupleAId}`);
  });

  it("POST /media/sign rejects unauthenticated request with 401", async () => {
    const res = await request(app).post("/media/sign");
    expect(res.status).toBe(401);
  });
});

describe("9. Moods, Notes & Couple Status (Task 3)", () => {
  it("POST /moods logs mood with emoji and energy", async () => {
    const res = await request(app)
      .post("/moods")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ emoji: "🥰", energy: 5, note: "Feeling so grateful" });

    expect(res.status).toBe(201);
    expect(res.body.emoji).toBe("🥰");
    expect(res.body.energy).toBe(5);
    expect(res.body.note).toBe("Feeling so grateful");
  });

  it("POST /moods rejects invalid energy (> 5)", async () => {
    const res = await request(app)
      .post("/moods")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ emoji: "🥰", energy: 10 });

    expect(res.status).toBe(400);
  });

  it("GET /moods/latest returns mine and partner moods", async () => {
    // Partner Alex also logs mood
    await request(app)
      .post("/moods")
      .set("Authorization", `Bearer ${tokenA2}`)
      .send({ emoji: "⚡", energy: 4, note: "Ready for our evening" });

    const res = await request(app)
      .get("/moods/latest")
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(200);
    expect(res.body.mine).toBeDefined();
    expect(res.body.mine.emoji).toBe("🥰");
    expect(res.body.partner).toBeDefined();
    expect(res.body.partner.emoji).toBe("⚡");
    expect(res.body.partnerName).toBe("Alex");
  });

  it("GET /moods with from and to date range returns history", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .get(`/moods?from=${yesterday}&to=${tomorrow}`)
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /notes with kind 'ping' creates a Thinking of you note", async () => {
    const res = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${tokenA1}`)
      .send({ body: "Thinking of you ❤️", kind: "ping" });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("ping");
    expect(res.body.body).toBe("Thinking of you ❤️");
  });

  it("GET /couple returns startDate and partner info", async () => {
    const res = await request(app)
      .get("/couple")
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(200);
    expect(res.body.couple.startDate).toBeDefined();
    expect(res.body.user.name).toBe("Alice");
    expect(res.body.user.shareCycle).toBe(true);
    expect(res.body.partner.name).toBe("Alex");
  });

  it("GET /progress/status checks partner post and reaction status", async () => {
    const res = await request(app)
      .get("/progress/status")
      .set("Authorization", `Bearer ${tokenA1}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.partnerPostedToday).toBe("boolean");
    expect(typeof res.body.partnerReactedToday).toBe("boolean");
    expect(res.body.partnerName).toBe("Alex");
  });
});
