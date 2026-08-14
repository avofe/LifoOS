import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, z } from "../validate";
import { getTimezone, formatDayKey, addDaysKey } from "../lib/time";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const createHabitSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional().default("✅"),
});

const toggleLogSchema = z.object({
  day: z.string().regex(DAY_KEY, "Day must be YYYY-MM-DD"),
});

export function createHabitsRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const tz = await getTimezone();
      const now = new Date();
      const today = formatDayKey(tz, now);
      const startKey = addDaysKey(today, -34);

      const habits = await prisma.habit.findMany({
        where: { userId: USER_ID, archived: false },
        orderBy: { createdAt: "asc" },
        include: {
          logs: {
            where: { day: { gte: startKey } },
            select: { day: true },
            orderBy: { day: "asc" },
          },
        },
      });

      const result = habits.map((h) => {
        const doneDays = new Set(h.logs.map((l) => l.day));
        let streak = 0;
        let cursor = doneDays.has(today) ? today : addDaysKey(today, -1);
        while (doneDays.has(cursor)) {
          streak += 1;
          cursor = addDaysKey(cursor, -1);
        }

        let record = 0;
        let run = 0;
        let d = startKey;
        while (d <= today) {
          run = doneDays.has(d) ? run + 1 : 0;
          if (run > record) record = run;
          d = addDaysKey(d, 1);
        }

        return {
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          streak,
          record,
          days: Array.from(doneDays),
        };
      });

      res.json({ habits: result, today });
    } catch (err) {
      console.error("[habits] GET /", err);
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  router.post("/", validate(createHabitSchema), async (req, res) => {
    try {
      const habit = await prisma.habit.create({
        data: {
          userId: USER_ID,
          name: req.body.name,
          emoji: req.body.emoji,
        },
        select: { id: true, name: true, emoji: true, createdAt: true },
      });
      res.status(201).json(habit);
    } catch (err) {
      console.error("[habits] POST /", err);
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      await prisma.habit.deleteMany({
        where: { id, userId: USER_ID },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[habits] DELETE /:id", err);
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  router.post("/:id/toggle", validate(toggleLogSchema), async (req, res) => {
    try {
      const id = String(req.params.id);
      const { day } = req.body;

      const habit = await prisma.habit.findFirst({
        where: { id, userId: USER_ID },
        select: { id: true },
      });
      if (!habit) {
        res.status(404).json({ error: "Habit not found" });
        return;
      }

      const existing = await prisma.habitLog.findUnique({
        where: { habitId_day: { habitId: id, day } },
      });

      if (existing) {
        await prisma.habitLog.delete({ where: { id: existing.id } });
        res.json({ done: false });
      } else {
        await prisma.habitLog.create({
          data: { habitId: id, userId: USER_ID, day },
        });
        res.json({ done: true });
      }
    } catch (err) {
      console.error("[habits] POST /:id/toggle", err);
      res.status(500).json({ error: "Failed to toggle habit" });
    }
  });

  return router;
}
