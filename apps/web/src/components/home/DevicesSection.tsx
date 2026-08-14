"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Device, DeviceBreakdown, DeviceType } from "@lifeos/types";
import { SectionCard, CardSkeleton } from "./SectionCard";

const TYPE_LABELS: Record<DeviceType, string> = {
  desktop: "ПК",
  mobile: "Телефон",
  tablet: "Планшет",
};

function lastSeen(iso: string): { label: string; stale: boolean } {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5 * 60 * 1000) return { label: "только что", stale: false };
  if (diff < 60 * 60 * 1000) return { label: `${Math.round(diff / 60000)} мин`, stale: false };
  if (diff < 2 * 3600 * 1000) {
    return { label: `${Math.round(diff / 3600000)}ч`, stale: false };
  }
  const h = Math.floor(diff / 3600000);
  return { label: h >= 24 ? `${Math.floor(h / 24)}д` : `${h}ч`, stale: true };
}

export function DevicesSection() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [breakdown, setBreakdown] = useState<DeviceBreakdown | null>(null);

  const fetchData = useCallback(() => {
    apiGet<Device[]>("/api/devices").then((d) => setDevices(d ?? []));
    apiGet<DeviceBreakdown>("/api/screentime/devices").then((d) => setBreakdown(d));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const byId = new Map(breakdown?.devices.map((d) => [d.id, d.totalToday]) ?? []);

  return (
    <SectionCard href="/settings" icon="⚙" title="Устройства">
      {devices === null ? (
        <div className="flex flex-col gap-2.5">
          <CardSkeleton className="h-[38px] w-full" />
          <CardSkeleton className="h-[38px] w-full" />
        </div>
      ) : devices.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">Устройства не подключены</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {devices.slice(0, 5).map((d) => {
            const seen = lastSeen(d.lastSeenAt);
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-surface-2/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[12px] text-zinc-200">{d.name}</span>
                  <span className="shrink-0 rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-500">
                    {TYPE_LABELS[d.type] ?? d.type}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {byId.get(d.id) && (
                    <span className="text-[10.5px] text-zinc-400">{byId.get(d.id)}</span>
                  )}
                  <span
                    className={`font-mono text-[9.5px] ${
                      seen.stale ? "text-amber-400" : "text-zinc-600"
                    }`}
                    title={`Синхронизация: ${seen.stale ? "давно молчит" : "в норме"}`}
                  >
                    {seen.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
