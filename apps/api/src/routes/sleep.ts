import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, z } from "../validate";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const upsertSleepSchema = z.object({
  day: z.string().regex(DAY_KEY, "Day must be YYYY-MM-DD"),
  bedAt: z.string().regex(TIME, "bedAt must be HH:MM"),
  wakeAt: z.string().regex(TIME, "wakeAt must be HH:MM"),
  note: z.string().max(200).optional().nullable(),
});

const updateSleepSchema = z.object({
  bedAt: z.string().regex(TIME, "bedAt must be HH:MM").optional(),
  wakeAt: z.string().regex(TIME, "wakeAt must be HH:MM").optional(),
  note: z.string().max(200).optional().nullable(),
});

export function sleepDurationMin(bedAt: string, wakeAt: string): number {
  const [bh, bm] = bedAt.split(":").map(Number);
  const [wh, wm] = wakeAt.split(":").map(Number);
  let min = wh * 60 + wm - (bh * 60 + bm);
  if (min < 0) min += 24 * 60;
  return min;
}

function toDto(
  log: { id: string; day: string; bedAt: string; wakeAt: string; note: string | null },
) {
  return {
    id: log.id,
    day: log.day,
    bedAt: log.bedAt,
    wakeAt: log.wakeAt,
    note: log.note,
    durationMin: sleepDurationMin(log.bedAt, log.wakeAt),
  };
}

export function createSleepRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const days = Number(req.query.days) || 30;
      const logs = await prisma.sleepLog.findMany({
        where: { userId: USER_ID },
        orderBy: { day: "desc" },
        take: Math.max(1, Math.min(days, 365)),
        select: { id: true, day: true, bedAt: true, wakeAt: true, note: true },
      });

      const recent = logs.slice(0, 7);
      const avg7 =
        recent.length > 0
          ? Math.round(
              recent.reduce((sum, l) => sum + sleepDurationMin(l.bedAt, l.wakeAt), 0) /
                recent.length,
            )
          : null;

      res.json({ logs: logs.map(toDto), avg7 });
    } catch (err) {
      console.error("[sleep] GET /", err);
      res.status(500).json({ error: "Failed to fetch sleep logs" });
    }
  });

  router.post("/", validate(upsertSleepSchema), async (req, res) => {
    try {
      const log = await prisma.sleepLog.upsert({
        where: { userId_day: { userId: USER_ID, day: req.body.day } },
        update: {
          bedAt: req.body.bedAt,
          wakeAt: req.body.wakeAt,
          note: req.body.note ?? null,
        },
        create: {
          userId: USER_ID,
          day: req.body.day,
          bedAt: req.body.bedAt,
          wakeAt: req.body.wakeAt,
          note: req.body.note ?? null,
        },
        select: { id: true, day: true, bedAt: true, wakeAt: true, note: true },
      });
      res.status(201).json(toDto(log));
    } catch (err) {
      console.error("[sleep] POST /", err);
      res.status(500).json({ error: "Failed to save sleep log" });
    }
  });

  router.patch("/:id", validate(updateSleepSchema), async (req, res) => {
    try {
      const id = String(req.params.id);
      const log = await prisma.sleepLog.updateMany({
        where: { id, userId: USER_ID },
        data: {
          bedAt: req.body.bedAt,
          wakeAt: req.body.wakeAt,
          note: req.body.note,
        },
      });
      if (log.count === 0) {
        res.status(404).json({ error: "Sleep log not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[sleep] PATCH /:id", err);
      res.status(500).json({ error: "Failed to update sleep log" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      await prisma.sleepLog.deleteMany({
        where: { id, userId: USER_ID },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[sleep] DELETE /:id", err);
      res.status(500).json({ error: "Failed to delete sleep log" });
    }
  });

  return router;
}
