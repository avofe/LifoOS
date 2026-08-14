import { prisma } from "@lifeos/db";
import type { StreakStatus } from "@lifeos/types";
import { USER_ID } from "../index";
import { getTimezone, getDayStart, getNextDayStart } from "./time";

const RECORD_KEY = "streakRecord";
const LOOKBACK_DAYS = 370;

export async function fetchStreak(): Promise<StreakStatus> {
  const tz = await getTimezone();
  const now = new Date();

  const settings = await prisma.setting.findMany({
    where: { userId: USER_ID, key: { in: ["screenLimitTotal", RECORD_KEY] } },
  });
  const map: Record<string, any> = {};
  for (const s of settings) map[s.key] = s.value;

  const limitMin = typeof map.screenLimitTotal === "number" ? map.screenLimitTotal : null;
  const storedRecord = typeof map.streakRecord === "number" ? map.streakRecord : 0;

  if (limitMin === null) {
    return {
      enabled: false,
      streak: 0,
      record: storedRecord,
      todayInNorm: false,
      todayTotalSec: 0,
      limitMin: null,
      bestUpdatedAt: null,
    };
  }

  const limitSec = limitMin * 60;
  const start = getDayStart(-LOOKBACK_DAYS, tz, now);
  const todayStart = getDayStart(0, tz, now);
  const end = getNextDayStart(todayStart);

  const rows = await prisma.screenEvent.findMany({
    where: { userId: USER_ID, timestamp: { gte: start, lt: end } },
    select: { timestamp: true, duration: true },
  });

  const totals = new Array(LOOKBACK_DAYS + 1).fill(0) as number[];
  for (const r of rows) {
    const idx = Math.floor((r.timestamp.getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < totals.length) totals[idx] += r.duration;
  }

  let streak = 0;
  for (let i = totals.length - 1; i >= 0; i--) {
    const total = totals[i];
    if (i < totals.length - 1 && total === 0) break;
    if (total > limitSec) break;
    streak++;
  }

  let completedStreak = 0;
  for (let i = totals.length - 2; i >= 0; i--) {
    const total = totals[i];
    if (total === 0) break;
    if (total > limitSec) break;
    completedStreak++;
  }

  const todayTotalSec = totals[totals.length - 1] ?? 0;
  const todayInNorm = todayTotalSec <= limitSec;

  let record = storedRecord;
  if (completedStreak > record) {
    record = completedStreak;
    await prisma.setting.upsert({
      where: { userId_key: { userId: USER_ID, key: RECORD_KEY } },
      create: { userId: USER_ID, key: RECORD_KEY, value: record },
      update: { value: record },
    });
  }

  return {
    enabled: true,
    streak,
    record,
    todayInNorm,
    todayTotalSec,
    limitMin,
    bestUpdatedAt: todayStart.toISOString().slice(0, 10),
  };
}
