import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

const DEFAULT_TZ = "Europe/Moscow";

let cachedTz: string | null = null;
let cachedTzLoadedAt = 0;

export async function getTimezone(): Promise<string> {
  const now = Date.now();
  if (cachedTz && now - cachedTzLoadedAt < 60_000) return cachedTz;

  try {
    const s = await prisma.setting.findUnique({
      where: { userId_key: { userId: USER_ID, key: "timezone" } },
    });
    const tz = typeof s?.value === "string" && s.value ? s.value : DEFAULT_TZ;
    cachedTz = tz;
    cachedTzLoadedAt = now;
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function setTimezoneCache(tz: string) {
  cachedTz = tz;
  cachedTzLoadedAt = Date.now();
}

export function getTodayStart(tz: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month")) - 1;
  const d = Number(get("day"));

  return new Date(Date.UTC(y, m, d));
}

export function getDayStart(offsetDays: number, tz: string, now = new Date()): Date {
  const today = getTodayStart(tz, now);
  today.setUTCDate(today.getUTCDate() + offsetDays);
  return today;
}

export function getNextDayStart(dayStart: Date): Date {
  const next = new Date(dayStart);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  if (h === 0) return `${m}м`;
  return `${h}ч ${m}м`;
}

export const DAY_MS = 86400000;
