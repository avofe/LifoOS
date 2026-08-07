import { Router } from "express";
import { prisma, Prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, createSubSchema, updateSubSchema } from "../validate";

export const subscriptionRouter: Router = Router();

subscriptionRouter.get("/", async (req, res) => {
  try {
    const upcomingDays = req.query.upcomingDays
      ? Number(req.query.upcomingDays)
      : undefined;

    const where: Prisma.SubscriptionWhereInput = { userId: USER_ID };

    if (upcomingDays) {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + upcomingDays);
      where.nextPaymentAt = { gte: from, lte: to };
    }

    const subs = await prisma.subscription.findMany({
      where,
      orderBy: { nextPaymentAt: "asc" },
    });

    const now = new Date();
    const data = subs.map((s) => ({
      ...s,
      cost: Number(s.cost),
      daysUntilPayment: Math.ceil(
        (s.nextPaymentAt.getTime() - now.getTime()) / 86400000
      ),
    }));

    res.json(data);
  } catch (err) {
    console.error("[subscriptions] GET /", err);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

subscriptionRouter.get("/stats", async (_req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: USER_ID },
    });

    let monthlyTotal = 0;
    let yearlyTotal = 0;

    for (const s of subs) {
      const cost = Number(s.cost);
      if (s.billingCycle === "monthly") {
        monthlyTotal += cost;
        yearlyTotal += cost * 12;
      } else if (s.billingCycle === "yearly") {
        monthlyTotal += cost / 12;
        yearlyTotal += cost;
      }
    }

    res.json({
      total: subs.length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    });
  } catch (err) {
    console.error("[subscriptions] GET /stats", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

subscriptionRouter.get("/calendar", async (req, res) => {
  try {
    const monthParam =
      typeof req.query.month === "string" ? req.query.month : undefined;
    const now = new Date();
    const year = monthParam ? Number(monthParam.slice(0, 4)) : now.getFullYear();
    const month = monthParam ? Number(monthParam.slice(5, 7)) - 1 : now.getMonth();

    if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
      res.status(400).json({ error: "Invalid month" });
      return;
    }

    const lastDay = new Date(year, month + 1, 0).getDate();

    const subs = await prisma.subscription.findMany({
      where: { userId: USER_ID },
    });

    const daysMap = new Map<
      number,
      { day: number; total: number; items: { id: string; name: string; cost: number; currency: string }[] }
    >();

    for (const s of subs) {
      const next = new Date(s.nextPaymentAt);
      const baseDay = next.getDate();
      const step = s.billingCycle === "yearly" ? 12 : 1;

      let y = next.getFullYear();
      let m = next.getMonth();
      let guard = 0;
      while (guard < 2400) {
        if (y > year || (y === year && m > month)) break;
        if (y === year && m === month) {
          const day = Math.min(baseDay, lastDay);
          const entry = daysMap.get(day) ?? { day, total: 0, items: [] };
          entry.total += Number(s.cost);
          entry.items.push({
            id: s.id,
            name: s.name,
            cost: Number(s.cost),
            currency: s.currency,
          });
          daysMap.set(day, entry);
          break;
        }
        m += step;
        y += Math.floor(m / 12);
        m = m % 12;
        guard++;
      }
    }

    const days = Array.from(daysMap.values()).sort((a, b) => a.day - b.day);
    const total = Math.round(days.reduce((sum, d) => sum + d.total, 0) * 100) / 100;

    res.json({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      total,
      days,
    });
  } catch (err) {
    console.error("[subscriptions] GET /calendar", err);
    res.status(500).json({ error: "Failed to fetch payment calendar" });
  }
});

subscriptionRouter.get("/:id", async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id as string },
    });
    if (!sub || sub.userId !== USER_ID) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...sub, cost: Number(sub.cost) });
  } catch (err) {
    console.error("[subscriptions] GET /:id", err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

subscriptionRouter.post("/", validate(createSubSchema), async (req, res) => {
  try {
    const { name, cost, currency, billingCycle, nextPaymentAt, category, notes } =
      req.body;

    const sub = await prisma.subscription.create({
      data: {
        name,
        cost,
        currency,
        billingCycle,
        nextPaymentAt: new Date(nextPaymentAt),
        category: category ?? null,
        notes: notes ?? null,
        userId: USER_ID,
      },
    });

    res.status(201).json({ ...sub, cost: Number(sub.cost) });
  } catch (err) {
    console.error("[subscriptions] POST /", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

subscriptionRouter.put("/:id", validate(updateSubSchema), async (req, res) => {
  try {
    const existing = await prisma.subscription.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing || existing.userId !== USER_ID) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { name, cost, currency, billingCycle, nextPaymentAt, category, notes } =
      req.body;

    const sub = await prisma.subscription.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(cost !== undefined && { cost }),
        ...(currency !== undefined && { currency }),
        ...(billingCycle !== undefined && { billingCycle }),
        ...(nextPaymentAt !== undefined && { nextPaymentAt: new Date(nextPaymentAt) }),
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ ...sub, cost: Number(sub.cost) });
  } catch (err) {
    console.error("[subscriptions] PUT /:id", err);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

subscriptionRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.subscription.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing || existing.userId !== USER_ID) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await prisma.subscription.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    console.error("[subscriptions] DELETE /:id", err);
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});
