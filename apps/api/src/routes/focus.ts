import { Router } from "express";
import { requireDeviceToken } from "../lib/auth";
import { validate, z } from "../validate";
import { getActiveFocus, startFocus, stopFocus } from "../lib/focus";

const startSchema = z.object({
  minutes: z.number().int().min(5).max(240),
});

export function createFocusRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const active = await getActiveFocus();
      res.json({ active });
    } catch (err) {
      console.error("[focus] GET /", err);
      res.status(500).json({ error: "Failed to fetch focus session" });
    }
  });

  router.post("/start", requireDeviceToken, validate(startSchema), async (req, res) => {
    try {
      const session = await startFocus(req.deviceId!, req.body.minutes);
      res.status(201).json(session);
    } catch (err) {
      console.error("[focus] POST /start", err);
      res.status(500).json({ error: "Failed to start focus session" });
    }
  });

  router.post("/stop", requireDeviceToken, async (req, res) => {
    try {
      const session = await stopFocus(req.deviceId!);
      res.json(session);
    } catch (err) {
      console.error("[focus] POST /stop", err);
      res.status(500).json({ error: "Failed to stop focus session" });
    }
  });

  return router;
}
