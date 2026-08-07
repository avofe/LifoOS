import { Router } from "express";
import { prisma } from "@lifeos/db";
import { fetchScreenTime, fetchAnalytics } from "../lib/screentime";
import { requireDeviceToken } from "../lib/auth";
import { USER_ID } from "../index";
import { validate, z } from "../validate";

const screenEventSchema = z.object({
  timestamp: z.string().min(1),
  duration: z.number().int().min(1),
  app: z.string().min(1).max(200),
  title: z.string().max(500).optional().nullable(),
});

const ingestSchema = z.object({
  events: z.array(screenEventSchema).max(5000),
});

const MOCK = {
  totalToday: "6ч 42м",
  weekDays: [
    { label: "Пн", height: "38%", over: false, today: false },
    { label: "Вт", height: "60%", over: false, today: false },
    { label: "Ср", height: "88%", over: true, today: false },
    { label: "Чт", height: "82%", over: true, today: false },
    { label: "Пт", height: "93%", over: true, today: false },
    { label: "Сб", height: "45%", over: false, today: false },
    { label: "Вс", height: "68%", over: false, today: true },
  ],
  apps: [
    { name: "YouTube", width: "72%", color: "#F07070", time: "2ч 18м" },
    { name: "VS Code", width: "50%", color: "#7B6FF0", time: "1ч 35м" },
    { name: "Браузер", width: "35%", color: "#52526A", time: "1ч 08м" },
    { name: "Telegram", width: "18%", color: "#2AABEE", time: "34м" },
  ],
};

const MOCK_ANALYTICS_DAILY = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return {
    date: d.toISOString().slice(0, 10),
    label: dayLabels[d.getDay()],
    total: Math.round(14400 + Math.random() * 21600),
    apps: [
      { name: "YouTube", color: "#F07070", seconds: Math.round(3600 + Math.random() * 7200) },
      { name: "VS Code", color: "#7B6FF0", seconds: Math.round(1800 + Math.random() * 5400) },
      { name: "Браузер", color: "#52526A", seconds: Math.round(1200 + Math.random() * 3600) },
      { name: "Telegram", color: "#2AABEE", seconds: Math.round(600 + Math.random() * 1800) },
    ],
  };
});

const MOCK_ANALYTICS = {
  daily: MOCK_ANALYTICS_DAILY,
  topApps: [
    { name: "YouTube", color: "#F07070", total: 36000 },
    { name: "VS Code", color: "#7B6FF0", total: 22400 },
    { name: "Браузер", color: "#52526A", total: 15600 },
    { name: "Telegram", color: "#2AABEE", total: 8400 },
  ],
  weekComparison: { current: 141200, previous: 158400, diffPercent: -11 },
  todayTotal: 23400,
};

export function screentimeRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const deviceId = typeof req.query.device === "string" ? req.query.device : undefined;
      const data = await fetchScreenTime(deviceId);
      res.json(data ?? MOCK);
    } catch (err) {
      console.error("[screentime] GET /", err);
      res.json(MOCK);
    }
  });

  router.get("/analytics", async (req, res) => {
    try {
      const deviceId = typeof req.query.device === "string" ? req.query.device : undefined;
      const data = await fetchAnalytics(deviceId);
      res.json(data ?? MOCK_ANALYTICS);
    } catch (err) {
      console.error("[screentime] GET /analytics", err);
      res.json(MOCK_ANALYTICS);
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
        title: e.title ?? null,
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
