import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, addChannelSchema } from "../validate";
import { getYouTubeKey, hasYouTubeKey, fetchNewVideos, invalidateYouTubeCache } from "../lib/youtube";

const YT_API = "https://www.googleapis.com/youtube/v3";

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
    try {
      const allVideos = await fetchNewVideos();
      res.json(allVideos);
    } catch (err: any) {
      console.error("[youtube] GET /videos", err);
      res.status(500).json({ error: "YouTube API error" });
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

      invalidateYouTubeCache();
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

      invalidateYouTubeCache();
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
