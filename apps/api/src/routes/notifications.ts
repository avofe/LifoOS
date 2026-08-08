import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { requireDeviceToken } from "../lib/auth";
import { fetchScreenLimits } from "../lib/screentime";
import { getTimezone, getDayStart, getNextDayStart, fmtTime } from "../lib/time";

interface PendingNotification {
  id: string;
  channel: "limits" | "summary";
  title: string;
  body: string;
}

export function createNotificationsRouter(): Router {
  const router = Router();

  router.get("/pending", requireDeviceToken, async (_req, res) => {
    try {
      const tz = await getTimezone();
      const now = new Date();

      const todayStart = getDayStart(0, tz, now);
      const dayKey = todayStart.toISOString().slice(0, 10);
      const result: PendingNotification[] = [];

      const limits = await fetchScreenLimits();

      if (limits.total.over && limits.total.limitMin !== null) {
        result.push({
          id: `limit-total-${dayKey}`,
          channel: "limits",
          title: "Лимит экрана исчерпан",
          body: `Сегодня ${fmtTime(limits.total.usedSec)} на экране при лимите ${limits.total.limitMin} мин`,
        });
      }

      for (const a of limits.apps) {
        if (a.over && a.limitMin !== null) {
          result.push({
            id: `limit-app-${a.name}-${dayKey}`,
            channel: "limits",
            title: `${a.name}: превышен лимит`,
            body: `${fmtTime(a.usedSec)} использовано при лимите ${a.limitMin} мин`,
          });
        }
      }

      const yesterdayStart = getDayStart(-1, tz, now);
      const todayEnd = getNextDayStart(todayStart);

      const yesterdayEvents = await prisma.screenEvent.findMany({
        where: {
          userId: USER_ID,
          timestamp: { gte: yesterdayStart, lt: todayStart },
        },
      });
      const yesterdaySec = yesterdayEvents.reduce((sum, e) => sum + e.duration, 0);

      if (yesterdaySec > 0) {
        const to = new Date(now.getTime() + 2 * 86400000);
        const subs = await prisma.subscription.findMany({
          where: { userId: USER_ID, nextPaymentAt: { gte: now, lte: to } },
          orderBy: { nextPaymentAt: "asc" },
        });

        let body = `Вчера ${fmtTime(yesterdaySec)} на экране`;
        if (subs.length > 0) {
          const upcoming = subs
            .map((s) => `${Number(s.cost)}₽ ${s.name}`)
            .join(", ");
          body += ` · Ближайшие платежи: ${upcoming}`;
        }

        result.push({
          id: `summary-${yesterdayStart.toISOString().slice(0, 10)}`,
          channel: "summary",
          title: "Сводка дня",
          body,
        });
      }

      res.json(result);
    } catch (err) {
      console.error("[notifications] GET /pending", err);
      res.status(500).json({ error: "Failed to fetch pending notifications" });
    }
  });

  return router;
}
