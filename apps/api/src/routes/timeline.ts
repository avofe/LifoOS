import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import type { TimelineEvent } from "@lifeos/types";

const YT_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_API_KEY = "AIzaSyDeKpue25ScCac-8zITG7854Ktx1N3FQsM";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

async function fetchYouTubeVideos(): Promise<TimelineEvent[]> {
  try {
    const integ = await prisma.integration.findUnique({
      where: { userId_service: { userId: USER_ID, service: "youtube" } },
    });
    const channels: { id: string; name: string }[] =
      integ?.config && Array.isArray((integ.config as any).channels)
        ? (integ.config as any).channels
        : [];

    if (channels.length === 0) return [];

    const results = await Promise.allSettled(
      channels.map(async (ch) => {
        const playlistId = "UU" + ch.id.slice(2);
        const url = `${YT_API}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=1&key=${YOUTUBE_API_KEY}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return [];
        const json: any = await r.json();
        return (json.items ?? [])
          .filter((i: any) => i.snippet?.resourceId?.videoId)
          .map((i: any) => ({
            time: formatTime(i.snippet.publishedAt),
            type: "youtube" as const,
            title: `Новое видео · <b>${ch.name}</b>`,
            description: i.snippet.title,
            dot: "accent" as const,
            ts: new Date(i.snippet.publishedAt).getTime(),
          }));
      })
    );

    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r: any) => r.value);
  } catch (err) {
    console.error("[timeline] fetchYouTubeVideos", err);
    return [];
  }
}

async function fetchTwitchStreams(): Promise<TimelineEvent[]> {
  try {
    const GQL = `query {
      users(logins: ["recrent","hibako","simuaz","cu6ickk"]) {
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
        time: formatTime(u.stream.createdAt),
        type: "twitch" as const,
        title: `<b>${u.displayName}</b> начал стрим`,
        description: `${u.stream.game?.name ?? "??"} · ${u.stream.viewers} зрителей`,
        dot: "green" as const,
        ts: new Date(u.stream.createdAt).getTime(),
      }));
  } catch (err) {
    console.error("[timeline] fetchTwitchStreams", err);
    return [];
  }
}

async function fetchSubscriptions(): Promise<TimelineEvent[]> {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: USER_ID },
    });

    const now = new Date();
    return subs
      .filter((s) => {
        const diff = new Date(s.nextPaymentAt).getTime() - now.getTime();
        return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000; // within 3 days
      })
      .map((s) => {
        const days = Math.ceil(
          (new Date(s.nextPaymentAt).getTime() - now.getTime()) / 86400000
        );
        return {
          time: formatTime(s.nextPaymentAt.toISOString()),
          type: "subscription" as const,
          title: `Напоминание: <b>${s.name}</b> через ${days === 0 ? "сегодня" : `${days} дн.`}`,
          description: `${Number(s.cost)} ${s.currency}`,
          dot: "orange" as const,
          ts: new Date(s.nextPaymentAt).getTime(),
        };
      });
  } catch (err) {
    console.error("[timeline] fetchSubscriptions", err);
    return [];
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timelineRouter(): Router {
  const router: Router = Router();

  router.get("/", async (_req, res) => {
    try {
      const [youtube, twitch, subs] = await Promise.all([
        fetchYouTubeVideos(),
        fetchTwitchStreams(),
        fetchSubscriptions(),
      ]);

      const events: TimelineEvent[] = [
        ...youtube,
        ...twitch,
        ...subs,
        {
          time: formatTime(new Date().toISOString()),
          type: "system",
          title: "AI подготовил утренний брифинг",
          description: `${youtube.length + twitch.length + subs.length} событий`,
          dot: "default",
          ts: Date.now(),
        },
      ];

      events.sort((a, b) => b.ts - a.ts);
      res.json(events.slice(0, 10));
    } catch (err: any) {
      console.error("[timeline] GET /", err);
      res.status(500).json({
        error: "Timeline error",
        detail: err?.message ?? String(err),
      });
    }
  });

  return router;
}
