import { Router } from "express";
import { prisma } from "@lifeos/db";
import type { DaySummary } from "@lifeos/types";
import { USER_ID } from "../index";
import { fetchYesterday, fetchScreenLimits, computeForecast } from "../lib/screentime";
import { fetchStreak } from "../lib/streak";
import { fetchNewVideos } from "../lib/youtube";
import { fetchStreams } from "../lib/twitch";
import { getTimezone, formatDayKey } from "../lib/time";

export function createSummaryRouter(): Router {
  const router: Router = Router();

  router.get("/", async (_req, res) => {
    try {
      const now = new Date();
      const tz = await getTimezone();
      const todayKey = formatDayKey(tz, now);

      const [yesterday, limits, streak, payments, videos, streams, tasks] =
        await Promise.allSettled([
          fetchYesterday(),
          fetchScreenLimits(),
          fetchStreak(),
          prisma.subscription.findMany({
            where: {
              userId: USER_ID,
              nextPaymentAt: { lt: new Date(now.getTime() + 3 * 86400000) },
            },
            orderBy: { nextPaymentAt: "asc" },
            take: 5,
          }),
          fetchNewVideos(),
          fetchStreams(),
          prisma.dayTask.findMany({
            where: { userId: USER_ID, day: todayKey },
            orderBy: [{ done: "asc" }, { sort: "asc" }, { createdAt: "asc" }],
            take: 10,
            select: { id: true, text: true, done: true },
          }),
        ]);

      const y = yesterday.status === "fulfilled" ? yesterday.value : null;
      const l = limits.status === "fulfilled" ? limits.value : null;
      const s = streak.status === "fulfilled" ? streak.value : null;

      const forecast = l
        ? await computeForecast(l.total.usedSec).catch(() => null)
        : null;

      const paymentsData: DaySummary["payments"] =
        payments.status === "fulfilled"
          ? payments.value.map((p) => ({
              name: p.name,
              amount: `${Number(p.cost)} ${p.currency}`,
              daysLeft: Math.max(
                0,
                Math.ceil((p.nextPaymentAt.getTime() - now.getTime()) / 86400000)
              ),
            }))
          : [];

      const videosData: DaySummary["videos"] =
        videos.status === "fulfilled"
          ? (videos.value as any[])
              .filter(
                (v) =>
                  new Date(v.publishedAt).getTime() >
                  now.getTime() - 48 * 3600000
              )
              .slice(0, 5)
              .map((v) => ({
                id: v.id,
                title: v.title,
                channel: v.channel,
                publishedAt: v.publishedAt,
              }))
          : [];

      const streamsData: DaySummary["streams"] =
        streams.status === "fulfilled"
          ? (streams.value as any[])
              .filter((st) => st.online)
              .slice(0, 5)
              .map((st) => ({
                displayName: st.displayName,
                game: st.game,
                viewers: st.viewers,
                title: st.title,
                uptime: st.uptime,
              }))
          : [];

      const todayRemainingSec =
        l?.total.limitMin != null ? l.total.limitMin * 60 - l.total.usedSec : null;

      const planData: DaySummary["plan"] =
        tasks.status === "fulfilled"
          ? tasks.value.map((t) => ({ id: t.id, text: t.text, done: t.done }))
          : [];

      const summary: DaySummary = {
        yesterday: y
          ? {
              totalSec: y.totalSec,
              limitMin: y.limitMin,
              over: y.over,
              apps: y.apps,
            }
          : null,
        todayTotalSec: l?.total.usedSec ?? 0,
        todayOver: l?.total.over ?? false,
        todayRemainingSec,
        forecast,
        streak: s?.enabled
          ? { streak: s.streak, record: s.record, enabled: true }
          : null,
        payments: paymentsData,
        videos: videosData,
        streams: streamsData,
        plan: planData,
      };

      res.json(summary);
    } catch (err) {
      console.error("[summary] GET /", err);
      res.status(500).json({ error: "Failed to build summary" });
    }
  });

  return router;
}
