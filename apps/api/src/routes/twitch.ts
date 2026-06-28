import { Router } from "express";
import https from "https";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export function createTwitchRouter(): Router {
  const router: Router = Router();

  router.get("/streams", async (_req, res) => {
    try {
      const integ = await prisma.integration.findUnique({
        where: { userId_service: { userId: USER_ID, service: "twitch" } },
      });

      const streamers = (integ?.config as any)?.streamers ?? [];

      if (streamers.length === 0) {
        res.json([]);
        return;
      }

      const logins = streamers.map((s: any) => `"${s.login}"`).join(",");
      const query = `query{users(logins:[${logins}]){id login displayName stream{title game{name}viewersCount createdAt type}}}`;
      const body = JSON.stringify({ query });

      const raw = await new Promise<string>((resolve, reject) => {
        const r = https.request(
          {
            hostname: "gql.twitch.tv",
            path: "/gql",
            method: "POST",
            headers: {
              "Client-ID": CLIENT_ID,
              "Content-Type": "application/json",
              Origin: "https://www.twitch.tv",
              "Content-Length": Buffer.byteLength(body),
            },
            timeout: 10000,
          },
          (resp) => {
            let d = "";
            resp.on("data", (c) => (d += c));
            resp.on("end", () => resolve(d));
          }
        );
        r.on("error", reject);
        r.on("timeout", () => {
          r.destroy();
          reject(new Error("timeout"));
        });
        r.write(body);
        r.end();
      });

      const json = JSON.parse(raw);

      if (json.errors) {
        res.status(502).json({ error: "Twitch error", details: json.errors });
        return;
      }

      const users = json.data?.users ?? [];
      const result = users
        .filter((u: any) => u?.login)
        .map((u: any) => ({
          id: u.id,
          login: u.login,
          displayName: u.displayName,
          online: u.stream !== null && u.stream.type === "live",
          title: u.stream?.title ?? null,
          game: u.stream?.game?.name ?? null,
          viewers: u.stream?.viewersCount ?? 0,
          startedAt: u.stream?.createdAt ?? null,
          uptime: u.stream ? formatUptime(new Date(u.stream.createdAt)) : null,
        }));

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

function formatUptime(startedAt: Date): string {
  const diff = Date.now() - startedAt.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}
