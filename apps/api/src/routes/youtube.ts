import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, addChannelSchema } from "../validate";
import { getYouTubeKey, hasYouTubeKey } from "../lib/youtube";

const YT_API = "https://www.googleapis.com/youtube/v3";

let cache: { data: any[]; ts: number } | null = null;
const CACHE_TTL = 3_600_000; // 1 hour

async function getTrackedChannels(): Promise<{ id: string; name: string }[]> {
  const integ = await prisma.integration.findUnique({
    where: { userId_service: { userId: USER_ID, service: "youtube" } },
  });
  if (!integ?.config || !Array.isArray((integ.config as any).channels)) {
    return [];
  }
  return (integ.config as any).channels as { id: string; name: string }[];
}

export function createYouTubeRouter(): Router {
  const router: Router = Router();

  router.get("/videos", async (_req, res) => {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }

    if (!hasYouTubeKey()) {
      res.json([]);
      return;
    }
    const apiKey = getYouTubeKey();

    try {
      const tracked = await getTrackedChannels();
      if (tracked.length === 0) {
        res.json([]);
        return;
      }

      const results = await Promise.allSettled(
        tracked.map(async (ch) => {
          const playlistId = "UU" + ch.id.slice(2);
          const url = `${YT_API}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=3&key=${apiKey}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) return { channel: ch.name, videos: [] };

          const json: any = await r.json();
          const videos = (json.items ?? [])
            .filter((item: any) => item.snippet?.resourceId?.videoId)
            .map((item: any) => ({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              channel: ch.name,
              channelId: ch.id,
              publishedAt: item.snippet.publishedAt,
              thumb:
                item.snippet.thumbnails?.medium?.url ??
                item.snippet.thumbnails?.default?.url ??
                null,
            }));

          return { channel: ch.name, videos };
        })
      );

      const allVideos = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r: any) => r.value.videos)
        .sort(
          (a: any, b: any) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
        .slice(0, 15);

      cache = { data: allVideos, ts: Date.now() };
      res.json(allVideos);
    } catch (err: any) {
      console.error("[youtube] GET /videos", err);
      res
        .status(500)
        .json({ error: "YouTube API error", detail: err?.message ?? String(err) });
    }
  });

  router.get("/channels", async (_req, res) => {
    try {
      const channels = await getTrackedChannels();
      res.json(channels);
    } catch (err) {
      console.error("[youtube] GET /channels", err);
      res.status(500).json({ error: "Failed to list channels" });
    }
  });

  router.post("/channels", validate(addChannelSchema), async (req, res) => {
    try {
      const { id, name } = req.body;

      let integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "youtube" } },
      });

      const channels: { id: string; name: string }[] = [];
      if (integ?.config && Array.isArray((integ.config as any).channels)) {
        channels.push(...(integ.config as any).channels);
      }

      if (channels.some((c) => c.id === id)) {
        res.status(409).json({ error: "Channel already tracked" });
        return;
      }

      channels.push({ id, name });

      if (!integ) {
        await prisma.integration.create({
          data: {
            service: "youtube",
            enabled: true,
            config: { channels },
            userId: USER_ID,
          },
        });
      } else {
        await prisma.integration.update({
          where: { userId_service: { userId: USER_ID, service: "youtube" } },
          data: { config: { channels } },
        });
      }

      cache = null;
      res.json({ channels });
    } catch (err) {
      console.error("[youtube] POST /channels", err);
      res.status(500).json({ error: "Failed to add channel" });
    }
  });

  router.delete("/channels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "youtube" } },
      });

      if (!integ?.config || !Array.isArray((integ.config as any).channels)) {
        res.status(404).json({ error: "No channels found" });
        return;
      }

      const channels = (integ.config as any).channels.filter(
        (c: any) => c.id !== id
      );

      await prisma.integration.update({
        where: { userId_service: { userId: USER_ID, service: "youtube" } },
        data: { config: { channels } },
      });

      cache = null;
      res.json({ channels });
    } catch (err) {
      console.error("[youtube] DELETE /channels/:id", err);
      res.status(500).json({ error: "Failed to remove channel" });
    }
  });

  router.get("/search", async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      res.status(400).json({ error: "Query too short" });
      return;
    }

    if (!hasYouTubeKey()) {
      res.status(400).json({ error: "YouTube API key not configured" });
      return;
    }
    const apiKey = getYouTubeKey();

    try {
      const url = `${YT_API}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=5&key=${apiKey}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        res.status(502).json({ error: "YouTube API error", status: r.status });
        return;
      }

      const json: any = await r.json();
      const channels = (json.items ?? []).map((item: any) => ({
        id: item.id.channelId,
        name: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails?.default?.url ?? null,
      }));

      res.json(channels);
    } catch (err) {
      console.error("[youtube] GET /search", err);
      res.status(500).json({ error: "Search error" });
    }
  });

  return router;
}
