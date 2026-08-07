import { Request, Response, NextFunction } from "express";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

const ACCESS_KEY = process.env.LIFEOS_ACCESS_KEY;

const PUBLIC_PATHS = ["/screentime/events"];

export function requireAccessKey(req: Request, res: Response, next: NextFunction) {
  if (!ACCESS_KEY) {
    next();
    return;
  }

  if (PUBLIC_PATHS.includes(req.path)) {
    next();
    return;
  }

  const key = req.header("x-api-key");
  if (key && key === ACCESS_KEY) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export async function requireDeviceToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header("x-device-token");
    if (!token) {
      res.status(401).json({ error: "Missing device token" });
      return;
    }

    const device = await prisma.device.findUnique({ where: { token } });
    if (!device || device.userId !== USER_ID) {
      res.status(401).json({ error: "Invalid device token" });
      return;
    }

    req.deviceId = device.id;
    next();
  } catch (err) {
    console.error("[auth] requireDeviceToken", err);
    res.status(500).json({ error: "Auth error" });
  }
}
