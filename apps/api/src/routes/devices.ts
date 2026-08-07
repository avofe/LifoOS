import { Router } from "express";
import { randomBytes } from "crypto";
import os from "os";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { validate, z } from "../validate";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  type: z.enum(["desktop", "mobile", "tablet"]).optional().default("desktop"),
});

function makeToken(): string {
  return randomBytes(24).toString("hex");
}

export function devicesRouter(): Router {
  const router: Router = Router();

  router.get("/", async (_req, res) => {
    try {
      const devices = await prisma.device.findMany({
        where: { userId: USER_ID },
        orderBy: { lastSeenAt: "desc" },
      });

      res.json(
        devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          os: d.os,
          lastSeenAt: d.lastSeenAt,
          createdAt: d.createdAt,
        }))
      );
    } catch (err) {
      console.error("[devices] GET /", err);
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  router.post("/register", validate(registerSchema), async (req, res) => {
    try {
      const { name, type } = req.body;

      const device = await prisma.device.create({
        data: {
          name,
          type,
          os: os.platform(),
          token: makeToken(),
          userId: USER_ID,
        },
      });

      res.status(201).json({
        id: device.id,
        name: device.name,
        type: device.type,
        token: device.token,
      });
    } catch (err) {
      console.error("[devices] POST /register", err);
      res.status(500).json({ error: "Failed to register device" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const device = await prisma.device.findUnique({ where: { id: req.params.id } });
      if (!device || device.userId !== USER_ID) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      await prisma.device.delete({ where: { id: device.id } });
      res.status(204).end();
    } catch (err) {
      console.error("[devices] DELETE /:id", err);
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  return router;
}
