import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { requireDeviceToken } from "../lib/auth";
import { fetchScreenLimits } from "../lib/screentime";
import { checkDeviceHealth, HealthAlert } from "../lib/health";
import { getActiveFocus } from "../lib/focus";
import { getTimezone, getDayStart, getNextDayStart, getHourOfDay, fmtTime } from "../lib/time";

type PendingChannel = "limits" | "summary" | "health" | "battle";

interface PendingNotification {
  id: string;
  channel: PendingChannel;
  title: string;
  body: string;
}

export function createNotificationsRouter(): Router {
  const router = Router();

  router.get("/pending", requireDeviceToken, async (req, res) => {
    try {
      const tz = await getTimezone();
      const now = new Date();

      const todayStart = getDayStart(0, tz, now);
      const dayKey = todayStart.toISOString().slice(0, 10);
      const result: PendingNotification[] = [];

      const focus = await getActiveFocus(req.deviceId);
      const inFocus = focus !== null;

      const limits = await fetchScreenLimits();

      if (!inFocus) {
        if (limits.total.over && limits.total.limitMin !== null) {
          result.push({
            id: `limit-total-${dayKey}`,
            channel: "limits",
            title: "Лимит экрана исчерпан",
            body: `Сегодня ${fmtTime(limits.total.usedSec)} на экране при лимите ${limits.total.limitMin} мин`,
          });
        } else if (
          limits.total.limitMin !== null &&
          limits.total.usedSec >= limits.total.limitMin * 60 - 15 * 60
        ) {
          result.push({
            id: `limit-total-soon-${dayKey}`,
            channel: "limits",
            title: "Через ~15 мин — лимит экрана",
            body: `Уже ${fmtTime(limits.total.usedSec)} из ${limits.total.limitMin} мин`,
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
          } else if (
            a.limitMin !== null &&
            a.usedSec >= a.limitMin * 60 - 15 * 60
          ) {
            result.push({
              id: `limit-app-soon-${a.name}-${dayKey}`,
              channel: "limits",
              title: `${a.name}: почти лимит`,
              body: `${fmtTime(a.usedSec)} из ${a.limitMin} мин`,
            });
          }
        }
      }

      const yesterdayStart = getDayStart(-1, tz, now);
      const todayEnd = getNextDayStart(todayStart);

      const yesterdayEvents = await prisma.screenEvent.findMany({
        where: {
          userId: USER_ID,
          timestamp: { gte: yesterdayStart, lt: todayStart },
        },
        select: { duration: true },
      });
      const yesterdaySec = yesterdayEvents.reduce((sum, e) => sum + e.duration, 0);

      if (!inFocus && yesterdaySec > 0) {
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

      const health: HealthAlert[] = await checkDeviceHealth();
      for (const a of health) {
        result.push(a);
      }

      const hour = getHourOfDay(tz, now);
      const todaySec = limits.total.usedSec;
      if (!inFocus && hour >= 18 && !limits.total.over && todaySec + yesterdaySec > 0) {
        const remaining =
          limits.total.limitMin !== null ? limits.total.limitMin * 60 - todaySec : null;
        const diffSec = todaySec - yesterdaySec;

        let title: string;
        let body: string;
        if (todaySec === 0) {
          title = "День без экрана";
          body = `Сегодня ещё не было использования, а вчера было ${fmtTime(yesterdaySec)}`;
        } else if (diffSec < 0) {
          title = "Сегодня лучше вчерашнего";
          body = `На ${fmtTime(-diffSec)} меньше, чем вчера (сейчас ${fmtTime(todaySec)})`;
        } else {
          title = "Битва со вчерашним днём";
          body = `Сейчас ${fmtTime(todaySec)} — на ${fmtTime(diffSec)} больше, чем вчера`;
          if (remaining !== null && remaining > 0) {
            body += `. До лимита осталось ${fmtTime(remaining)}`;
          }
        }

        result.push({
          id: `battle-${dayKey}`,
          channel: "battle",
          title,
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
