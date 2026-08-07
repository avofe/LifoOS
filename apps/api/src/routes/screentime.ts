import { Router } from "express";
import { prisma } from "@lifeos/db";
import { fetchScreenTime, fetchAnalytics, fetchDeviceBreakdown } from "../lib/screentime";
import { requireDeviceToken } from "../lib/auth";
import { USER_ID } from "../index";
import { validate, z } from "../validate";

const screenEventSchema = z.object({
  timestamp: z.string().min(1),
  duration: z.number().int().min(1),
  app: z.string().min(1).max(200),
  title: z.string().max(2000).optional().nullable(),
});

const ingestSchema = z.object({
  events: z.array(screenEventSchema).max(5000),
});

const EMPTY_SCREEN_TIME = { totalToday: null, weekDays: [], apps: [] };

export function screentimeRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const deviceId = typeof req.query.device === "string" ? req.query.device : undefined;
      const data = await fetchScreenTime(deviceId);
      if (!data && deviceId) {
        res.status(404).json({ error: "No screen time data for this device" });
        return;
      }
      res.json(data ?? EMPTY_SCREEN_TIME);
    } catch (err) {
      console.error("[screentime] GET /", err);
      res.json(EMPTY_SCREEN_TIME);
    }
  });

  router.get("/devices", async (_req, res) => {
    try {
      const data = await fetchDeviceBreakdown();
      res.json(data);
    } catch (err) {
      console.error("[screentime] GET /devices", err);
      res.status(500).json({ error: "Failed to fetch device breakdown" });
    }
  });

  router.get("/analytics", async (req, res) => {
    try {
      const deviceId = typeof req.query.device === "string" ? req.query.device : undefined;
      const data = await fetchAnalytics(deviceId);
      if (!data && deviceId) {
        res.status(404).json({ error: "No analytics data for this device" });
        return;
      }
      res.json(data ?? null);
    } catch (err) {
      console.error("[screentime] GET /analytics", err);
      res.json(null);
    }
  });

  router.post("/events", requireDeviceToken, validate(ingestSchema), async (req, res) => {
    try {
      const deviceId = req.deviceId!;
      const { events } = req.body;

      const rows = events.map((e: { timestamp: string; duration: number; app: string; title?: string | null }) => ({
        deviceId,
        userId: USER_ID,
        timestamp: new Date(e.timestamp),
        duration: e.duration,
        app: e.app,
        title: (e.title ?? null)?.slice(0, 500),
      }));

      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        await prisma.screenEvent.createMany({
          data: rows.slice(i, i + batchSize),
          skipDuplicates: false,
        });
      }

      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() },
      });

      res.json({ received: rows.length });
    } catch (err) {
      console.error("[screentime] POST /events", err);
      res.status(500).json({ error: "Failed to ingest screen time events" });
    }
  });

  router.get("/raw", async (_req, res) => {
    try {
      const AW_BASE = "http://127.0.0.1:5600/api/0/";

      const bucketsR = await fetch(`${AW_BASE}buckets/`, { signal: AbortSignal.timeout(3000) });
      const buckets = await bucketsR.json();

      const windowBucketId = Object.keys(buckets).find(
        (id) => id.includes("aw-watcher-window") || id.includes("aw-watcher-windows")
      );

      if (!windowBucketId) {
        res.json({ error: "No window bucket found", buckets: Object.keys(buckets) });
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      const eventsR = await fetch(
        `${AW_BASE}buckets/${encodeURIComponent(windowBucketId)}/events?start=${encodeURIComponent(startOfToday.toISOString())}&end=${encodeURIComponent(endOfToday.toISOString())}&limit=5000`,
        { signal: AbortSignal.timeout(5000) }
      );
      const events = await eventsR.json() as any[];

      const valid = events.filter((e: any) => e.duration >= 1);

      const totalDuration = valid.reduce((s: number, e: any) => s + e.duration, 0);

      const perApp: Record<string, number> = {};
      for (const e of valid) {
        const app = (e.data?.app ?? e.data?.application ?? "").trim();
        const title = (e.data?.title ?? "").trim();
        let name = app;
        if (/chrome|firefox|edge/i.test(app)) {
          const cleaned = title.replace(/[—–-]\s*(Mozilla\s*)?(Firefox|Google\s*Chrome|Microsoft\s*Edge)$/i, "").trim();
          name = cleaned || "Браузер";
        }
        perApp[name] = (perApp[name] ?? 0) + e.duration;
      }

      const sorted = Object.entries(perApp)
        .sort(([, a], [, b]) => b - a)
        .map(([name, sec]) => ({
          name,
          seconds: Math.round(sec),
          time: `${Math.floor(sec / 3600)}ч ${Math.round((sec % 3600) / 60)}м`,
        }));

      res.json({
        bucketId: windowBucketId,
        totalEvents: events.length,
        validEvents: valid.length,
        totalTracked: `${Math.floor(totalDuration / 3600)}ч ${Math.round((totalDuration % 3600) / 60)}м`,
        perAppTotal: sorted,
      });
    } catch (err: any) {
      console.error("[screentime] GET /raw", err);
      res.json({ error: err?.message ?? String(err) });
    }
  });

  return router;
}
