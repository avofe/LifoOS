import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import type { TimelineEvent } from "@lifeos/types";
import { fetchNewVideos } from "../lib/youtube";
import { fetchScreenLimits, fetchYesterday } from "../lib/screentime";
import { fetchStreak } from "../lib/streak";
import { getTimezone, fmtTime } from "../lib/time";

const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const STALE_AFTER_MS = 2 * 3600 * 1000;
const YT_RECENT_MS = 7 * 24 * 3600 * 1000;
const SUBS_LOOKAHEAD_MS = 14 * 24 * 3600 * 1000;
const MAX_EVENTS = 12;

/* ══════════════════════════════════════════════════════════════
   YouTube: недавние видео отслеживаемых каналов (кэш 1ч)
   ══════════════════════════════════════════════════════════════ */

async function fetchYouTubeVideos(): Promise<TimelineEvent[]> {
  try {
    const videos = await fetchNewVideos();
    const cutoff = Date.now() - YT_RECENT_MS;
    return videos
      .filter((v: any) => new Date(v.publishedAt).getTime() >= cutoff)
      .map((v: any) => ({
        time: formatTime(new Date(v.publishedAt)),
        type: "youtube" as const,
        title: `Новое видео · ${v.channel}`,
        description: v.title,
        dot: "accent" as const,
        ts: new Date(v.publishedAt).getTime(),
      }));
  } catch (err) {
    console.error("[timeline] fetchYouTubeVideos", err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   Twitch: онлайн-стримы
   ══════════════════════════════════════════════════════════════ */

async function fetchTwitchStreams(): Promise<TimelineEvent[]> {
  try {
    const integ = await prisma.integration.findUnique({
      where: { userId_service: { userId: USER_ID, service: "twitch" } },
    });
    const streamers: { login: string; name: string }[] =
      integ?.config && Array.isArray((integ.config as any).streamers)
        ? (integ.config as any).streamers
        : [];

    if (streamers.length === 0) return [];

    const GQL = `query {
      users(logins: ${JSON.stringify(streamers.map((s) => s.login))}) {
        id login displayName stream {
          id title game { name } viewers createdAt
        }
      }
    }`;

    const r = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Client-ID": TWITCH_CLIENT_ID,
      },
      body: JSON.stringify({ query: GQL }),
      signal: AbortSignal.timeout(10000),
    });

    if (!r.ok) return [];
    const json: any = await r.json();
    const users: any[] = json.data?.users ?? [];

    return users
      .filter((u: any) => u?.stream)
      .map((u: any) => ({
        time: formatTime(new Date(u.stream.createdAt)),
        type: "twitch" as const,
        title: `${u.displayName} начал стрим`,
        description: `${u.stream.game?.name ?? "??"} · ${u.stream.viewers} зрителей`,
        dot: "green" as const,
        ts: new Date(u.stream.createdAt).getTime(),
      }));
  } catch (err) {
    console.error("[timeline] fetchTwitchStreams", err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   Подписки: просроченные + ближайшие 14 дней
   ══════════════════════════════════════════════════════════════ */

async function fetchSubscriptions(): Promise<TimelineEvent[]> {
  try {
    const now = new Date();
    const until = new Date(now.getTime() + SUBS_LOOKAHEAD_MS);
    const subs = await prisma.subscription.findMany({
      where: {
        userId: USER_ID,
        nextPaymentAt: { lte: until },
      },
      orderBy: { nextPaymentAt: "asc" },
    });

    return subs.slice(0, 4).map((s) => {
      const diff = new Date(s.nextPaymentAt).getTime() - now.getTime();
      const days = Math.ceil(diff / 86400000);
      const overdue = days < 0;
      const label = overdue
        ? `просрочена на ${Math.abs(days)} дн.`
        : days === 0
          ? "сегодня"
          : days === 1
            ? "завтра"
            : `через ${days} дн.`;
      return {
        time: formatTime(new Date(s.nextPaymentAt)),
        type: "subscription" as const,
        title: `Напоминание: ${s.name}`,
        description: `${Number(s.cost)} ${s.currency} · ${label}`,
        dot: "orange" as const,
        ts: new Date(s.nextPaymentAt).getTime(),
      };
    });
  } catch (err) {
    console.error("[timeline] fetchSubscriptions", err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   Экран: превышения лимитов + стрик
   ══════════════════════════════════════════════════════════════ */

let streakCache: { data: Awaited<ReturnType<typeof fetchStreak>>; ts: number } | null = null;
const STREAK_CACHE_TTL = 10 * 60 * 1000;

async function getCachedStreak() {
  if (streakCache && Date.now() - streakCache.ts < STREAK_CACHE_TTL) {
    return streakCache.data;
  }
  const data = await fetchStreak();
  streakCache = { data, ts: Date.now() };
  return data;
}

async function fetchScreenEvents(): Promise<TimelineEvent[]> {
  try {
    const now = new Date();
    const [limits, streak, yesterday] = await Promise.all([
      fetchScreenLimits(),
      getCachedStreak(),
      fetchYesterday().catch(() => null),
    ]);
    const events: TimelineEvent[] = [];

    if (limits.total.over && limits.total.limitMin !== null) {
      events.push({
        time: formatTime(now),
        type: "system" as const,
        title: "Лимит экрана исчерпан",
        description: `Сегодня ${fmtTime(limits.total.usedSec)} при лимите ${limits.total.limitMin} мин`,
        dot: "orange" as const,
        ts: now.getTime(),
      });
    }

    for (const a of limits.apps) {
      if (a.over && a.limitMin !== null) {
        events.push({
          time: formatTime(now),
          type: "system" as const,
          title: `${a.name}: превышен лимит`,
          description: `${fmtTime(a.usedSec)} при лимите ${a.limitMin} мин`,
          dot: "orange" as const,
          ts: now.getTime(),
        });
      }
    }

    for (const dv of limits.devices) {
      if (dv.over && dv.limitMin !== null) {
        events.push({
          time: formatTime(now),
          type: "system" as const,
          title: `${dv.name}: превышен лимит`,
          description: `${fmtTime(dv.usedSec)} при лимите ${dv.limitMin} мин`,
          dot: "orange" as const,
          ts: now.getTime(),
        });
      }
    }

    if (streak.enabled && streak.streak > 0) {
      events.push({
        time: formatTime(now),
        type: "system" as const,
        title: `Стрик: ${streak.streak} ${streak.streak === 1 ? "день" : "дней"} в рамках лимита`,
        description:
          streak.record > 0 ? `рекорд ${streak.record} дн.` : "продолжай в том же духе",
        dot: "green" as const,
        ts: now.getTime(),
      });
    }

    if (yesterday && yesterday.totalSec > 0) {
      const diffSec = limits.total.usedSec - yesterday.totalSec;
      if (limits.total.usedSec > 0 && diffSec !== 0) {
        const better = diffSec < 0;
        events.push({
          time: formatTime(now),
          type: "system" as const,
          title: better ? "Сегодня лучше вчерашнего" : "Сегодня больше экрана, чем вчера",
          description: `${
            better ? `на ${fmtTime(-diffSec)} меньше` : `на ${fmtTime(diffSec)} больше`
          } (сейчас ${fmtTime(limits.total.usedSec)})`,
          dot: better ? "green" as const : "orange" as const,
          ts: now.getTime(),
        });
      }
    }

    return events;
  } catch (err) {
    console.error("[timeline] fetchScreenEvents", err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   Устройства: перестали синхронизироваться
   ══════════════════════════════════════════════════════════════ */

async function fetchDeviceAlerts(): Promise<TimelineEvent[]> {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_AFTER_MS);

    const devices = await prisma.device.findMany({
      where: { userId: USER_ID },
      select: { id: true, name: true, lastSeenAt: true },
    });

    const activeIds = await prisma.screenEvent.groupBy({
      by: ["deviceId"],
      where: { userId: USER_ID, timestamp: { gte: cutoff } },
      _count: { _all: true },
    });
    const active = new Set(activeIds.map((g) => g.deviceId));

    return devices
      .filter((d) => d.lastSeenAt < cutoff && active.has(d.id))
      .sort((a, b) => a.lastSeenAt.getTime() - b.lastSeenAt.getTime())
      .slice(0, 2)
      .map((d) => {
        const hours = Math.floor((now.getTime() - d.lastSeenAt.getTime()) / 3600000);
        return {
          time: formatTime(d.lastSeenAt),
          type: "system" as const,
          title: `⚠ ${d.name} не синхронизируется`,
          description: `последний раз ${hours >= 24 ? `${Math.floor(hours / 24)} дн. назад` : `${hours} ч назад`}`,
          dot: "default" as const,
          ts: d.lastSeenAt.getTime(),
        };
      });
  } catch (err) {
    console.error("[timeline] fetchDeviceAlerts", err);
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════
   Форматирование времени: время сегодня, день для остального
   ══════════════════════════════════════════════════════════════ */

function formatTime(date: Date): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((start.getTime() - startToday.getTime()) / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === -1) return "вчера";
  if (diffDays === 1) return "завтра";
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function timelineRouter(): Router {
  const router: Router = Router();

  router.get("/", async (_req, res) => {
    try {
      const [youtube, twitch, subs, screen, devices] = await Promise.all([
        fetchYouTubeVideos(),
        fetchTwitchStreams(),
        fetchSubscriptions(),
        fetchScreenEvents(),
        fetchDeviceAlerts(),
      ]);

      const events: TimelineEvent[] = [...youtube, ...twitch, ...subs, ...screen, ...devices];

      events.sort((a, b) => b.ts - a.ts);
      res.json(events.slice(0, MAX_EVENTS));
    } catch (err: any) {
      console.error("[timeline] GET /", err);
      res.status(500).json({ error: "Timeline error" });
    }
  });

  return router;
}
