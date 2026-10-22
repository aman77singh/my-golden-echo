import { describe, it, expect } from "vitest";
import {
  calculateCycleStats,
  predictCycle,
  generateCycleInsights,
  ESTIMATES_DISCLAIMER,
} from "./cycle";
import { ICycle, ISymptomLog } from "@/types/shared";

describe("Cycle Prediction Engine", () => {
  it("defaults to 28 days cycle length when fewer than 2 cycles exist", () => {
    const stats = calculateCycleStats([]);
    expect(stats.avgCycleLength).toBe(28);
    expect(stats.stdDev).toBe(2);

    const singleCycle: ICycle[] = [
      {
        _id: "1",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-09-01",
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];
    const statsSingle = calculateCycleStats(singleCycle);
    expect(statsSingle.avgCycleLength).toBe(28);
  });

  it("calculates average cycle length and standard deviation over completed cycles", () => {
    // 4 cycles: Sept 1, Sept 29 (28 days), Oct 28 (29 days), Nov 26 (29 days)
    const cycles: ICycle[] = [
      {
        _id: "1",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-09-01",
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
      {
        _id: "2",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-09-29",
        createdAt: "2026-09-29",
        updatedAt: "2026-09-29",
      },
      {
        _id: "3",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-10-28",
        createdAt: "2026-10-28",
        updatedAt: "2026-10-28",
      },
      {
        _id: "4",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-11-26",
        createdAt: "2026-11-26",
        updatedAt: "2026-11-26",
      },
    ];

    const stats = calculateCycleStats(cycles);
    expect(stats.completedCycleCount).toBe(3);
    // (28 + 29 + 29) / 3 = 28.7
    expect(stats.avgCycleLength).toBeCloseTo(28.7, 1);
    expect(stats.stdDev).toBeGreaterThan(0);
  });

  it("calculates expected next period, range with standard deviation, ovulation, and fertile window", () => {
    const cycles: ICycle[] = [
      {
        _id: "1",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
      {
        _id: "2",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-10-29", // 28 days later
        createdAt: "2026-10-29",
        updatedAt: "2026-10-29",
      },
    ];

    const refDate = new Date("2026-11-05"); // Day 8 of cycle 2
    const prediction = predictCycle(cycles, refDate);

    expect(prediction).not.toBeNull();
    if (!prediction) return;

    // Expected next start: Oct 29 + 28 days = Nov 26
    const expected = prediction.expectedNextStart.toISOString().split("T")[0];
    expect(expected).toBe("2026-11-26");

    // Ovulation is expected - 14 days = Nov 12
    const ovulation = prediction.ovulationDate.toISOString().split("T")[0];
    expect(ovulation).toBe("2026-11-12");

    // Fertile window = ovulation - 5 (Nov 7) to ovulation + 1 (Nov 13)
    const fertileStart = prediction.fertileWindowStart.toISOString().split("T")[0];
    const fertileEnd = prediction.fertileWindowEnd.toISOString().split("T")[0];
    expect(fertileStart).toBe("2026-11-07");
    expect(fertileEnd).toBe("2026-11-13");

    // Standard deviation range
    expect(prediction.earliestNextStart.getTime()).toBeLessThanOrEqual(
      prediction.expectedNextStart.getTime()
    );
    expect(prediction.latestNextStart.getTime()).toBeGreaterThanOrEqual(
      prediction.expectedNextStart.getTime()
    );

    // Current day on Nov 5: Oct 29 to Nov 5 = 7 days diff + 1 = Day 8
    expect(prediction.currentDay).toBe(8);
    expect(prediction.currentPhase).toBe("follicular");
  });

  it("contains visible medical disclaimer", () => {
    expect(ESTIMATES_DISCLAIMER).toBe(
      "Estimates only, not medical advice or contraception."
    );
  });

  it("generates symptom correlation insights after 3+ cycles", () => {
    const cycles: ICycle[] = [
      {
        _id: "c1",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-07-01",
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      },
      {
        _id: "c2",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-07-29",
        createdAt: "2026-07-29",
        updatedAt: "2026-07-29",
      },
      {
        _id: "c3",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-08-26",
        createdAt: "2026-08-26",
        updatedAt: "2026-08-26",
      },
      {
        _id: "c4",
        userId: "u1",
        coupleId: "c1",
        startDate: "2026-09-23",
        createdAt: "2026-09-23",
        updatedAt: "2026-09-23",
      },
    ];

    // Symptom logs: headache repeatedly on day 2
    // Cycle 1 day 2: 2026-07-02
    // Cycle 2 day 2: 2026-07-30
    // Cycle 3 day 2: 2026-08-27
    const symptomLogs: ISymptomLog[] = [
      {
        _id: "s1",
        userId: "u1",
        coupleId: "c1",
        date: "2026-07-02",
        symptoms: ["headache", "fatigue"],
        pain: 4,
        createdAt: "2026-07-02",
        updatedAt: "2026-07-02",
      },
      {
        _id: "s2",
        userId: "u1",
        coupleId: "c1",
        date: "2026-07-30",
        symptoms: ["headache", "cramps"],
        pain: 6,
        createdAt: "2026-07-30",
        updatedAt: "2026-07-30",
      },
      {
        _id: "s3",
        userId: "u1",
        coupleId: "c1",
        date: "2026-08-27",
        symptoms: ["headache"],
        pain: 5,
        createdAt: "2026-08-27",
        updatedAt: "2026-08-27",
      },
      {
        _id: "s4",
        userId: "u1",
        coupleId: "c1",
        date: "2026-07-01",
        symptoms: ["cramps"],
        pain: 7,
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      },
      {
        _id: "s5",
        userId: "u1",
        coupleId: "c1",
        date: "2026-07-29",
        symptoms: ["cramps"],
        pain: 8,
        createdAt: "2026-07-29",
        updatedAt: "2026-07-29",
      },
    ];

    const insights = generateCycleInsights(cycles, symptomLogs);
    expect(insights.length).toBeGreaterThan(0);

    const headacheInsight = insights.find((i) =>
      i.title.toLowerCase().includes("headaches most often on day 2")
    );
    expect(headacheInsight).toBeDefined();
    expect(headacheInsight?.confidence).toBe("high");
  });
});
