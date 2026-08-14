import "dotenv/config";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import cors from "cors";
import morgan from "morgan";
import express from "express";
import { prisma } from "@lifeos/db";
import { subscriptionRouter } from "./routes/subscriptions";
import { createTwitchRouter } from "./routes/twitch";
import { createYouTubeRouter } from "./routes/youtube";
import { timelineRouter } from "./routes/timeline";
import { screentimeRouter } from "./routes/screentime";
import { createAiRouter } from "./routes/ai";
import { videoStateRouter } from "./routes/video-state";
import { createSettingsRouter } from "./routes/settings";
import { devicesRouter } from "./routes/devices";
import { createNotificationsRouter } from "./routes/notifications";
import { createFocusRouter } from "./routes/focus";
import { createSummaryRouter } from "./routes/summary";
import { weatherRouter } from "./routes/weather";
import { requireAccessKey } from "./lib/auth";
import { initGroq, reinitGroq } from "./lib/gemini";
import { initYouTube, reinitYouTube } from "./lib/youtube";
import { initWeatherLocation } from "./lib/weather";

export const USER_ID = "00000000-0000-0000-0000-000000000001";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.set("etag", false);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  const cpus = os.cpus().length || 1;
  const load = os.loadavg()[0] ?? 0;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let diskPct: number | null = null;
  try {
    const df = execSync("df -k / 2>/dev/null | tail -1", { timeout: 2000 })
      .toString()
      .trim()
      .split(/\s+/);
    if (df.length >= 5) {
      const used = Number(df[2]);
      const avail = Number(df[3]);
      if (used + avail > 0) diskPct = Math.round((used / (used + avail)) * 100);
    }
  } catch {
    // disk check unavailable
  }

  res.json({
    status: "ok",
    cpu: { load: Math.round(load * 100) / 100, cores: cpus, pct: Math.min(100, Math.round((load / cpus) * 100)) },
    ram: { usedMb: Math.round(usedMem / 1024 / 1024), totalMb: Math.round(totalMem / 1024 / 1024), pct: Math.round((usedMem / totalMem) * 100) },
    disk: { pct: diskPct },
    uptimeSec: Math.round(os.uptime()),
  });
});

app.use("/api", requireAccessKey);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/twitch", createTwitchRouter());
app.use("/api/youtube", createYouTubeRouter());
app.use("/api/timeline", timelineRouter());
app.use("/api/ai", createAiRouter());
app.use("/api/screentime", screentimeRouter());
app.use("/api/video-state", videoStateRouter);
app.use("/api/settings", createSettingsRouter());
app.use("/api/devices", devicesRouter());
app.use("/api/notifications", createNotificationsRouter());
app.use("/api/focus", createFocusRouter());
app.use("/api/summary", createSummaryRouter());
app.use("/api/weather", weatherRouter());

// Serve frontend static files (production)
// STATIC_DIR env var is set by Tauri launcher in production
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, "../../web/out");
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
  console.log(`Serving static files from ${staticDir}`);
} else if (process.env.NODE_ENV === "production") {
  console.log(`Static dir not found at ${staticDir}, frontend must be served externally`);
}

async function seed() {
  const exists = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!exists) {
    await prisma.user.create({
      data: { id: USER_ID, email: "me@lifeos.local", name: "Me" },
    });
    console.log("Default user seeded");
  }

  const seeded = await prisma.setting.findUnique({
    where: { userId_key: { userId: USER_ID, key: "seeded" } },
  });
  if (seeded) return;

  const subCount = await prisma.subscription.count({ where: { userId: USER_ID } });
  if (subCount === 0) {
    const now = new Date();
    const subs = [
      { name: "Яндекс Плюс", cost: 299, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth() + 1, 15), category: "Music", notes: "Музыка + Кинопоиск" },
      { name: "Telegram Premium", cost: 249, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth() + 1, 20), category: "Other", notes: "" },
      { name: "VK Музыка", cost: 199, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth() + 1, 5), category: "Music", notes: "" },
      { name: "Okko", cost: 499, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth() + 1, 22), category: "Video", notes: "" },
      { name: "PREMIER", cost: 499, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth() + 1, 10), category: "Video", notes: "" },
      { name: "Hetzner VPS", cost: 840, billingCycle: "monthly", nextPaymentAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), category: "Hosting", notes: "CX22, 8.40€" },
    ];
    for (const sub of subs) {
      await prisma.subscription.create({
        data: {
          name: sub.name,
          cost: sub.cost,
          currency: "RUB",
          billingCycle: sub.billingCycle,
          nextPaymentAt: sub.nextPaymentAt,
          category: sub.category,
          notes: sub.notes,
          userId: USER_ID,
        },
      });
    }
    console.log(`${subs.length} demo subscriptions seeded`);
  }
}

  seed()
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    })
    .then(async () => {
    const seededFlag = await prisma.setting.findUnique({
      where: { userId_key: { userId: USER_ID, key: "seeded" } },
    });
    if (seededFlag) {
      console.log("Seed flag present, skipping demo integrations");
    } else {
    const ytInteg = await prisma.integration.findUnique({
      where: { userId_service: { userId: USER_ID, service: "youtube" } },
    });
    if (!ytInteg) {
      await prisma.integration.create({
        data: {
          service: "youtube",
          enabled: true,
          config: {
            channels: [
              { id: "UCsBjURrPoezykLs9EqgamOA", name: "Fireship" },
              { id: "UCd3vSweI4e3ix3XkZWCh32w", name: "Theo" },
              { id: "UC8ENHE5xdFSwx71u0gf1sSg", name: "ThePrimeagen" },
            ],
          },
          userId: USER_ID,
        },
      });
      console.log("Default YouTube channels seeded");
    }

    const twInteg = await prisma.integration.findUnique({
      where: { userId_service: { userId: USER_ID, service: "twitch" } },
    });
    if (!twInteg) {
      await prisma.integration.create({
        data: {
          service: "twitch",
          enabled: true,
          config: {
            streamers: [
              { login: "recrent", name: "recrent" },
              { login: "hibako", name: "hibako" },
              { login: "simuaz", name: "simuaz" },
              { login: "cu6ickk", name: "cu6ickk" },
            ],
          },
          userId: USER_ID,
        },
      });
      console.log("Default Twitch streamers seeded");
    }
    await prisma.setting.create({
      data: { userId: USER_ID, key: "seeded", value: "true" },
    });
    console.log("Seed flag set");
    }

    const envGroq = process.env.GROQ_API_KEY ?? "";
    if (envGroq) {
      initGroq(envGroq);
      console.log("Groq AI initialized from env");
    }

    const envYoutube = process.env.YOUTUBE_API_KEY ?? "";
    if (envYoutube) {
      initYouTube(envYoutube);
      console.log("YouTube API key loaded from env");
    }

    const envWeather = process.env.WEATHER_LOCATION ?? "";
    if (envWeather) {
      initWeatherLocation(envWeather);
    }

    const dbGroqKey = await prisma.setting.findUnique({
      where: { userId_key: { userId: USER_ID, key: "groqApiKey" } },
    });
    if (dbGroqKey?.value && typeof dbGroqKey.value === "string") {
      reinitGroq(dbGroqKey.value);
      console.log("Groq API key loaded from DB");
    }

    const dbYoutubeKey = await prisma.setting.findUnique({
      where: { userId_key: { userId: USER_ID, key: "youtubeApiKey" } },
    });
    if (dbYoutubeKey?.value && typeof dbYoutubeKey.value === "string") {
      reinitYouTube(dbYoutubeKey.value);
      console.log("YouTube API key loaded from DB");
    }

    const dbWeather = await prisma.setting.findUnique({
      where: { userId_key: { userId: USER_ID, key: "weatherLocation" } },
    });
    if (dbWeather?.value && typeof dbWeather.value === "string") {
      initWeatherLocation(dbWeather.value);
      console.log("Weather location loaded from DB");
    }

  app.listen(port, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${port}`);
  });
});
