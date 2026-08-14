import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { getTimezone, getDayStart } from "./time";

export interface HealthAlert {
  id: string;
  channel: "health";
  title: string;
  body: string;
}

const SILENT_AFTER_MS = 2 * 3600_000;
const ALIVE_REQUIREMENT_MS = 2 * 3600_000;

export async function checkDeviceHealth(): Promise<HealthAlert[]> {
  const tz = await getTimezone();
  const now = new Date();
  const dayKey = getDayStart(0, tz, now).toISOString().slice(0, 10);

  const devices = await prisma.device.findMany({ where: { userId: USER_ID } });

  const alerts: HealthAlert[] = [];
  for (const d of devices) {
    const wasAlive = d.lastSeenAt.getTime() - d.createdAt.getTime() >= ALIVE_REQUIREMENT_MS;
    if (!wasAlive) continue;
    const silentMs = now.getTime() - d.lastSeenAt.getTime();
    if (silentMs < SILENT_AFTER_MS) continue;

    const hours = Math.floor(silentMs / 3600_000);
    alerts.push({
      id: `device-down-${d.id}-${dayKey}`,
      channel: "health",
      title: `${d.name} молчит`,
      body: `Нет синхронизации уже ${hours} ч. Проверь батарейную оптимизацию.`,
    });
  }
  return alerts;
}
