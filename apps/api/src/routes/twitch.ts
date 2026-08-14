import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { fetchStreams } from "../lib/twitch";

export function createTwitchRouter(): Router {
  const router: Router = Router();

  router.get("/streams", async (_req, res) => {
    try {
      const result = await fetchStreams();
      res.json(result);
    } catch (err: any) {
      console.error("[twitch] GET /streams", err);
      res.status(500).json({
        error: "Failed to fetch Twitch data",
        detail: err?.message ?? String(err),
      });
    }
  });

  router.get("/streamers", async (_req, res) => {
    try {
      const integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
      });
      const streamers = (integ?.config as any)?.streamers ?? [];
      res.json(streamers);
    } catch (err) {
      console.error("[twitch] GET /streamers", err);
      res.status(500).json({ error: "Failed to fetch streamers" });
    }
  });

  router.post("/streamers", async (req, res) => {
    try {
      const { login, name } = req.body;
      if (!login || !name) {
        res.status(400).json({ error: "login and name are required" });
        return;
      }

      const integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
      });

      const streamers: any[] = (integ?.config as any)?.streamers ?? [];
      if (streamers.some((s: any) => s.login === login)) {
        res.status(409).json({ error: "Streamer already tracked" });
        return;
      }

      streamers.push({ login, name });
      await prisma.integration.upsert({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
        create: {
          userId: USER_ID,
          service: "twitch",
          enabled: true,
          config: { streamers },
        },
        update: { config: { streamers } },
      });

      res.json(streamers);
    } catch (err) {
      console.error("[twitch] POST /streamers", err);
      res.status(500).json({ error: "Failed to add streamer" });
    }
  });

  router.delete("/streamers/:login", async (req, res) => {
    try {
      const { login } = req.params;
      const integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
      });

      const streamers: any[] = (integ?.config as any)?.streamers ?? [];
      const filtered = streamers.filter((s: any) => s.login !== login);

      if (filtered.length === streamers.length) {
        res.status(404).json({ error: "Streamer not found" });
        return;
      }

      await prisma.integration.upsert({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
        create: {
          userId: USER_ID,
          service: "twitch",
          enabled: true,
          config: { streamers: filtered },
        },
        update: { config: { streamers: filtered } },
      });

      res.json(filtered);
    } catch (err) {
      console.error("[twitch] DELETE /streamers/:login", err);
      res.status(500).json({ error: "Failed to remove streamer" });
    }
  });

  return router;
}
