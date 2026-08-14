import { prisma } from "@lifeos/db";
import type { StreakStatus } from "@lifeos/types";
import { USER_ID } from "../index";
import { getTimezone, getDayStart, getNextDayStart } from "./time";
import { getAppMeta, categorize } from "./screentime";

const RECORD_KEY = "streakRecord";
const LOOKBACK_DAYS = 370;

export async function fetchStreak(): Promise<StreakStatus> {
  const tz = await getTimezone();
  const now = new Date();

  const settings = await prisma.setting.findMany({
    where: { userId: USER_ID, key: { in: ["screenLimitTotal", "screenLimitApps", RECORD_KEY] } },
  });
  const map: Record<string, any> = {};
  for (const s of settings) map[s.key] = s.value;

  const totalLimitMin = typeof map.screenLimitTotal === "number" ? map.screenLimitTotal : null;
  const appLimits: Record<string, number> =
    map.screenLimitApps && typeof map.screenLimitApps === "object"
      ? (map.screenLimitApps as Record<string, number>)
      : {};
  const storedRecord = typeof map.streakRecord === "number" ? map.streakRecord : 0;

  const appLimitEntries = Object.entries(appLimits).filter(
    ([, limitMin]) => typeof limitMin === "number" && Number.isFinite(limitMin)
  );
  const enabled = totalLimitMin !== null || appLimitEntries.length > 0;

  if (!enabled) {
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

  await getAppMeta();
  const start = getDayStart(-LOOKBACK_DAYS, tz, now);
  const todayStart = getDayStart(0, tz, now);
  const end = getNextDayStart(todayStart);

  const rows = await prisma.screenEvent.findMany({
    where: { userId: USER_ID, timestamp: { gte: start, lt: end } },
    select: { timestamp: true, duration: true, app: true, title: true },
  });

  const dayCount = LOOKBACK_DAYS + 1;
  const totals = new Array(dayCount).fill(0) as number[];
  const appTotals: Map<string, number>[] = Array.from({ length: dayCount }, () => new Map());

  for (const r of rows) {
    const idx = Math.floor((r.timestamp.getTime() - start.getTime()) / 86400000);
    if (idx < 0 || idx >= dayCount) continue;
    totals[idx] += r.duration;
    const cat = categorize(r.app, r.title ?? "");
    if (cat.skip) continue;
    const cur = appTotals[idx].get(cat.name) ?? 0;
    appTotals[idx].set(cat.name, cur + r.duration);
  }

  const isNormDay = (idx: number): boolean => {
    if (totals[idx] === 0) return true;
    if (totalLimitMin !== null && totals[idx] > totalLimitMin * 60) return false;
    for (const [name, limitMin] of appLimitEntries) {
      if ((appTotals[idx].get(name) ?? 0) > limitMin * 60) return false;
    }
    return true;
  };

  let streak = 0;
  for (let i = dayCount - 1; i >= 0; i--) {
    if (!isNormDay(i)) break;
    streak++;
  }

  let completedStreak = 0;
  for (let i = dayCount - 2; i >= 0; i--) {
    if (!isNormDay(i)) break;
    completedStreak++;
  }

  const todayTotalSec = totals[dayCount - 1] ?? 0;
  const todayInNorm = isNormDay(dayCount - 1);

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
    limitMin: totalLimitMin,
    bestUpdatedAt: todayStart.toISOString().slice(0, 10),
  };
}
