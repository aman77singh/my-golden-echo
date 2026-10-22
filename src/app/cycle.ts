import { differenceInDays, addDays, parseISO, isAfter, isBefore } from "date-fns";
import { ICycle, ISymptomLog, CyclePhase } from "@/types/shared";

export const ESTIMATES_DISCLAIMER =
  "Estimates only, not medical advice or contraception.";

export interface CyclePrediction {
  avgCycleLength: number;
  stdDev: number;
  expectedNextStart: Date;
  earliestNextStart: Date;
  latestNextStart: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  currentDay: number;
  currentPhase: CyclePhase;
  daysUntilNextPeriod: number;
  isPeriodActive: boolean;
}

export interface CycleInsight {
  title: string;
  description: string;
  confidence: "high" | "moderate" | "preliminary";
}

export function parseDateOnly(val: string | Date): Date {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const str = typeof val === "string" ? val.slice(0, 10) : "";
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(val);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Computes average cycle length and standard deviation over the last 3-6 completed cycles.
 * Defaults to 28 days with standard deviation of 2 days if insufficient history.
 */
export function calculateCycleStats(cycles: ICycle[]): {
  avgCycleLength: number;
  stdDev: number;
  completedCycleCount: number;
} {
  if (!cycles || cycles.length < 2) {
    return {
      avgCycleLength: 28,
      stdDev: 2,
      completedCycleCount: 0,
    };
  }

  // Sort chronologically ascending
  const sorted = [...cycles].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevStart = new Date(sorted[i - 1].startDate);
    const currStart = new Date(sorted[i].startDate);
    const diff = differenceInDays(currStart, prevStart);

    // Realistic biological cycle length filter (18 - 50 days)
    if (diff >= 18 && diff <= 50) {
      lengths.push(diff);
    }
  }

  if (lengths.length === 0) {
    return {
      avgCycleLength: 28,
      stdDev: 2,
      completedCycleCount: 0,
    };
  }

  // Consider the last 3 to 6 completed cycles
  const recentLengths = lengths.slice(-6);
  const count = recentLengths.length;
  const sum = recentLengths.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  // Sample standard deviation
  let variance = 0;
  if (count > 1) {
    const sumSqDiff = recentLengths.reduce(
      (acc, val) => acc + Math.pow(val - mean, 2),
      0
    );
    variance = sumSqDiff / (count - 1);
  }

  const stdDev = count > 1 ? Math.sqrt(variance) : 1.5;

  return {
    avgCycleLength: Math.round(mean * 10) / 10,
    stdDev: Math.max(1, Math.round(stdDev * 10) / 10),
    completedCycleCount: count,
  };
}

/**
 * Predicts next period, ovulation, fertile window and current phase.
 */
export function predictCycle(
  cycles: ICycle[],
  referenceDate: Date = new Date()
): CyclePrediction | null {
  if (!cycles || cycles.length === 0) {
    return null;
  }

  // Find latest cycle
  const sortedDesc = [...cycles].sort(
    (a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  const latest = sortedDesc[0];
  const latestStart = new Date(latest.startDate);

  const { avgCycleLength, stdDev } = calculateCycleStats(cycles);

  const roundedAvg = Math.round(avgCycleLength);
  const roundedStd = Math.round(stdDev);

  // Predictions
  const expectedNextStart = addDays(latestStart, roundedAvg);
  const earliestNextStart = addDays(expectedNextStart, -roundedStd);
  const latestNextStart = addDays(expectedNextStart, roundedStd);

  // Ovulation is about next_start - 14
  const ovulationDate = addDays(expectedNextStart, -14);
  // Fertile window = ovulation - 5 through ovulation + 1
  const fertileWindowStart = addDays(ovulationDate, -5);
  const fertileWindowEnd = addDays(ovulationDate, 1);

  // Current day in cycle (1-indexed)
  const currentDay = Math.max(1, differenceInDays(referenceDate, latestStart) + 1);
  const daysUntilNextPeriod = Math.max(0, differenceInDays(expectedNextStart, referenceDate));

  // Determine current phase
  // 1. Menstrual: Day 1 until period end or day 5
  // 2. Follicular: Day 6 until fertile window start (around day 12)
  // 3. Ovulatory: Fertile window (ovulation - 5 to ovulation + 1)
  // 4. Luteal: Post ovulation window until next period
  let currentPhase: CyclePhase = "follicular";

  const periodDuration = latest.endDate
    ? differenceInDays(new Date(latest.endDate), latestStart) + 1
    : 5;

  const isPeriodActive =
    !latest.endDate ||
    !isAfter(referenceDate, new Date(latest.endDate)) ||
    currentDay <= periodDuration;

  if (currentDay <= Math.max(5, periodDuration)) {
    currentPhase = "menstrual";
  } else if (
    !isBefore(referenceDate, fertileWindowStart) &&
    !isAfter(referenceDate, fertileWindowEnd)
  ) {
    currentPhase = "ovulatory";
  } else if (isBefore(referenceDate, fertileWindowStart)) {
    currentPhase = "follicular";
  } else {
    currentPhase = "luteal";
  }

  return {
    avgCycleLength,
    stdDev,
    expectedNextStart,
    earliestNextStart,
    latestNextStart,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    currentDay,
    currentPhase,
    daysUntilNextPeriod,
    isPeriodActive,
  };
}

/**
 * Generates personalized insights after 3+ completed cycles by correlating symptoms with cycle day.
 */
export function generateCycleInsights(
  cycles: ICycle[],
  symptomLogs: ISymptomLog[]
): CycleInsight[] {
  const insights: CycleInsight[] = [];
  const { completedCycleCount } = calculateCycleStats(cycles);

  if (completedCycleCount < 3 || symptomLogs.length < 5) {
    return [
      {
        title: "Collecting cycle patterns",
        description:
          "Keep logging! Rich patterns and symptom correlations emerge automatically after 3+ cycles.",
        confidence: "preliminary",
      },
    ];
  }

  // Correlate symptoms to cycle day
  const sortedCycles = [...cycles].sort(
    (a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const symptomByDay = new Map<string, number[]>();
  const painByDay = new Map<number, number[]>();

  for (const log of symptomLogs) {
    const logDate = parseDateOnly(log.date);
    // Find the cycle this log belongs to
    const matchingCycle = sortedCycles.find(
      (c) => !isBefore(logDate, parseDateOnly(c.startDate))
    );

    if (matchingCycle) {
      const day = differenceInDays(logDate, parseDateOnly(matchingCycle.startDate)) + 1;
      if (day >= 1 && day <= 35) {
        for (const sym of log.symptoms) {
          const list = symptomByDay.get(sym) || [];
          list.push(day);
          symptomByDay.set(sym, list);
        }

        if (log.pain !== undefined && log.pain > 0) {
          const pains = painByDay.get(day) || [];
          pains.push(log.pain);
          painByDay.set(day, pains);
        }
      }
    }
  }

  // Find peak day for headache
  const headacheDays = symptomByDay.get("headache");
  if (headacheDays && headacheDays.length >= 2) {
    const dayCounts = countOccurrences(headacheDays);
    const [topDay, count] = getTopEntry(dayCounts);
    if (topDay && count >= 2) {
      insights.push({
        title: `Headaches most often on day ${topDay}`,
        description: `Logged on day ${topDay} across multiple cycles. Planning quiet time or extra hydration on this day can provide relief.`,
        confidence: "high",
      });
    }
  }

  // Find peak day for cramps
  const crampDays = symptomByDay.get("cramps");
  if (crampDays && crampDays.length >= 2) {
    const dayCounts = countOccurrences(crampDays);
    const [topDay] = getTopEntry(dayCounts);
    const pains = painByDay.get(Number(topDay)) || [];
    const avgPain =
      pains.length > 0
        ? (pains.reduce((a, b) => a + b, 0) / pains.length).toFixed(1)
        : null;

    insights.push({
      title: `Cramps peak on cycle day ${topDay}`,
      description: avgPain
        ? `Average pain level recorded at ${avgPain}/10. Keep heating pads, herbal tea, and gentle rest ready.`
        : `Cramps are most commonly reported on day ${topDay} of your cycle.`,
      confidence: "high",
    });
  }

  // Find fatigue & bloating patterns
  const fatigueDays = symptomByDay.get("fatigue");
  if (fatigueDays && fatigueDays.length >= 2) {
    const inMenstrual = fatigueDays.filter((d) => d <= 5).length;
    const inLuteal = fatigueDays.filter((d) => d >= 18).length;

    if (inMenstrual >= inLuteal && inMenstrual >= 2) {
      insights.push({
        title: "Energy drops during menstrual phase",
        description:
          "Fatigue is concentrated in the first 3-5 days. Prioritize sleep and gentle movement over high-intensity workouts.",
        confidence: "moderate",
      });
    } else if (inLuteal >= 2) {
      insights.push({
        title: "Luteal phase fatigue pattern",
        description:
          "Energy dips in the week before your period. Nourishing meals rich in magnesium and early bedtimes help smooth this transition.",
        confidence: "moderate",
      });
    }
  }

  const bloatingDays = symptomByDay.get("bloating");
  if (bloatingDays && bloatingDays.length >= 2) {
    insights.push({
      title: "Bloating pattern identified",
      description:
        "Bloating tends to occur during hormonal shifts. Peppermint tea and low-sodium comfort food can ease the sensation.",
      confidence: "moderate",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Consistent cycle regularity",
      description:
        "Your cycle rhythms show healthy recurrence with steady phase transitions.",
      confidence: "high",
    });
  }

  return insights;
}

function countOccurrences(arr: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const n of arr) {
    map.set(n, (map.get(n) || 0) + 1);
  }
  return map;
}

function getTopEntry(map: Map<number, number>): [number | null, number] {
  let topKey: number | null = null;
  let maxCount = 0;
  for (const [key, count] of map.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topKey = key;
    }
  }
  return [topKey, maxCount];
}
