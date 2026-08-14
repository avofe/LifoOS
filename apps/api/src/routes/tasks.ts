import { Router } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, z } from "../validate";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const createTaskSchema = z.object({
  day: z.string().regex(DAY_KEY, "Day must be YYYY-MM-DD"),
  text: z.string().min(1).max(200),
});

const updateTaskSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

const carryTaskSchema = z.object({
  toDate: z.string().regex(DAY_KEY, "Day must be YYYY-MM-DD"),
});

export function createTasksRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const day =
        typeof req.query.date === "string" && DAY_KEY.test(req.query.date)
          ? req.query.date
          : null;
      if (!day) {
        res.status(400).json({ error: "Missing or invalid ?date=YYYY-MM-DD" });
        return;
      }

      const tasks = await prisma.dayTask.findMany({
        where: { userId: USER_ID, day },
        orderBy: [{ done: "asc" }, { sort: "asc" }, { createdAt: "asc" }],
        select: { id: true, text: true, done: true, day: true },
      });
      res.json({ tasks });
    } catch (err) {
      console.error("[tasks] GET /", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  router.post("/", validate(createTaskSchema), async (req, res) => {
    try {
      const last = await prisma.dayTask.findFirst({
        where: { userId: USER_ID, day: req.body.day },
        orderBy: { sort: "desc" },
        select: { sort: true },
      });
      const task = await prisma.dayTask.create({
        data: {
          userId: USER_ID,
          day: req.body.day,
          text: req.body.text,
          sort: (last?.sort ?? -1) + 1,
        },
        select: { id: true, text: true, done: true, day: true },
      });
      res.status(201).json(task);
    } catch (err) {
      console.error("[tasks] POST /", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  router.patch("/:id", validate(updateTaskSchema), async (req, res) => {
    try {
      const id = String(req.params.id);
      const task = await prisma.dayTask.updateMany({
        where: { id, userId: USER_ID },
        data: req.body,
      });
      if (task.count === 0) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[tasks] PATCH /:id", err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  router.post("/:id/carry", validate(carryTaskSchema), async (req, res) => {
    try {
      const id = String(req.params.id);
      const task = await prisma.dayTask.updateMany({
        where: { id, userId: USER_ID },
        data: { day: req.body.toDate, done: false },
      });
      if (task.count === 0) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[tasks] POST /:id/carry", err);
      res.status(500).json({ error: "Failed to carry task" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      await prisma.dayTask.deleteMany({
        where: { id, userId: USER_ID },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[tasks] DELETE /:id", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  return router;
}
