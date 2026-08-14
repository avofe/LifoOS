import { prisma } from "@lifeos/db";
import type { FocusSessionView } from "@lifeos/types";
import { USER_ID } from "../index";

export async function getActiveFocus(deviceId?: string): Promise<FocusSessionView | null> {
  const now = new Date();
  const where: { userId: string; endedAt: null; endsAt: { gt: Date }; deviceId?: string } = {
    userId: USER_ID,
    endedAt: null,
    endsAt: { gt: now },
  };
  if (deviceId) where.deviceId = deviceId;

  const session = await prisma.focusSession.findFirst({
    where,
    orderBy: { startedAt: "desc" },
  });
  if (!session) return null;

  return {
    id: session.id,
    deviceId: session.deviceId,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    remainingSec: Math.max(0, Math.round((session.endsAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function startFocus(deviceId: string, minutes: number): Promise<FocusSessionView> {
  const now = new Date();

  await prisma.focusSession.updateMany({
    where: { userId: USER_ID, deviceId, endedAt: null },
    data: { endedAt: now },
  });

  const endsAt = new Date(now.getTime() + minutes * 60_000);
  const session = await prisma.focusSession.create({
    data: { userId: USER_ID, deviceId, startedAt: now, endsAt },
  });

  return {
    id: session.id,
    deviceId: session.deviceId,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    remainingSec: minutes * 60,
  };
}

export async function stopFocus(deviceId: string): Promise<FocusSessionView | null> {
  const now = new Date();
  const active = await prisma.focusSession.findFirst({
    where: { userId: USER_ID, deviceId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!active) return null;

  await prisma.focusSession.update({
    where: { id: active.id },
    data: { endedAt: now },
  });

  return {
    id: active.id,
    deviceId: active.deviceId,
    startedAt: active.startedAt.toISOString(),
    endsAt: active.endsAt.toISOString(),
    remainingSec: 0,
  };
}
