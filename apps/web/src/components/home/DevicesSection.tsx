"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiGet } from "@/lib/api";
import type { Device, DeviceBreakdown, DeviceType, FocusSessionView } from "@lifeos/types";
import { SectionCard, CardSkeleton } from "./SectionCard";

const TYPE_LABELS: Record<DeviceType, string> = {
  desktop: "ПК",
  mobile: "Телефон",
  tablet: "Планшет",
};

const SILENT_AFTER_MS = 2 * 3600 * 1000;

const FOCUS_MINUTES = [15, 30, 45, 60];

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

function remaining(endsAtIso: string): number {
  return Math.max(0, Math.round((new Date(endsAtIso).getTime() - Date.now()) / 1000));
}

export function DevicesSection() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [breakdown, setBreakdown] = useState<DeviceBreakdown | null>(null);
  const [focus, setFocus] = useState<FocusSessionView | null | undefined>(undefined);
  const [, forceTick] = useState(0);

  const fetchData = useCallback(() => {
    apiGet<Device[]>("/api/devices").then((d) => setDevices(d ?? []));
    apiGet<DeviceBreakdown>("/api/screentime/devices").then((d) => setBreakdown(d));
    apiGet<{ active: FocusSessionView | null }>("/api/focus").then((d) => setFocus(d?.active ?? null));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => {
      fetchData();
      forceTick((n) => n + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const startFocus = async (minutes: number) => {
    const s = await apiFetch<FocusSessionView>("/api/focus/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    setFocus(s);
  };

  const stopFocus = async () => {
    await apiFetch<FocusSessionView | null>("/api/focus/stop", { method: "POST" });
    setFocus(null);
  };

  const byId = new Map(breakdown?.devices.map((d) => [d.id, d.totalToday]) ?? []);
  const silent = devices?.filter((d) => lastSeen(d.lastSeenAt).stale) ?? [];

  const focusRemaining = focus ? remaining(focus.endsAt) : 0;

  return (
    <SectionCard href="/settings" icon="⚙" title="Устройства">
      {silent.length > 0 && (
        <div className="mb-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          ⚠ {silent.map((d) => d.name).join(", ")} не синхронизируется — проверь
          батарейную оптимизацию
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-surface-2/60 px-3 py-2">
        {focus ? (
          <>
            <span className="flex items-center gap-2 text-[12px] text-zinc-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Фокус до{" "}
              <b className="font-mono text-zinc-100">
                {new Date(focus.endsAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </b>
              <span className="font-mono text-[10.5px] text-zinc-500">
                осталось {Math.floor(focusRemaining / 60)}м
              </span>
            </span>
            <button
              onClick={stopFocus}
              className="chip shrink-0 border-red-500/20 text-red-400 hover:text-red-300"
            >
              ✕ Стоп
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-zinc-400">Фокус-режим</span>
            <div className="flex shrink-0 items-center gap-1">
              {FOCUS_MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => startFocus(m)}
                  className="chip hover:bg-accent hover:text-white"
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {devices === null ? (
        <div className="flex flex-col gap-2.5">
          <CardSkeleton className="h-[38px] w-full" />
          <CardSkeleton className="h-[38px] w-full" />
        </div>
      ) : devices.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">Устройства не подключены</p>
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
                      seen.stale ? "text-amber-400" : "text-zinc-500"
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
