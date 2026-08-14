"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { DeviceBreakdown, DeviceType } from "@lifeos/types";

const TYPE_LABELS: Record<DeviceType, string> = {
  desktop: "ПК",
  mobile: "Телефон",
  tablet: "Планшет",
};

export function ScreenTimeCard() {
  const [data, setData] = useState<DeviceBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchData = useCallback(() => {
    apiGet<DeviceBreakdown>("/api/screentime/devices")
      .then((d) => {
        setData(d);
        setUpdatedAt(new Date());
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-[13px] font-semibold text-zinc-200">
            Экранное время
          </span>
          <span className="h-[14px] w-20 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-surface-2 p-[10px_12px]">
              <div className="mb-2 h-[11px] w-2/3 animate-pulse rounded bg-zinc-800" />
              <div className="mb-1 h-[18px] w-1/3 animate-pulse rounded bg-zinc-800" />
              <div className="h-[10px] w-1/2 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="mb-4 flex h-8 items-end gap-[3px]">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-1 animate-pulse items-end justify-center rounded bg-zinc-800/60" style={{ height: `${20 + ((i * 37) % 60)}%` }} />
          ))}
        </div>
        <div className="flex flex-col gap-[7px]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[11px] w-full animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="font-display text-[13px] font-semibold text-zinc-200">
            Экранное время
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          ActivityWatch не найден.{" "}
          <a
            href="https://activitywatch.net/downloads/"
            className="text-accent underline"
          >
            Установить
          </a>
        </p>
      </div>
    );
  }

  const devices = data.devices;
  const hasAggregate = (data.weekDays?.length ?? 0) > 0 || (data.apps?.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <span className="font-display text-[13px] font-semibold text-zinc-200">
          Экранное время
        </span>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-[10px] text-zinc-500">
              обновлено {updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <span className="font-display text-[13px] font-medium text-zinc-500">
            Сегодня: <b className="text-zinc-200">{data.totalToday ?? "—"}</b>
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Обновить"
            className={`flex h-6 w-6 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-surface-2 hover:text-accent-light disabled:opacity-40 ${refreshing ? "animate-spin" : ""}`}
          >
            ⟳
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <p className="mb-3.5 text-xs text-zinc-500">
          Устройства не зарегистрированы. Добавь их в{" "}
          <a href="/settings" className="text-accent underline">
            настройках
          </a>
          .
        </p>
      ) : (
        <div className="mb-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-zinc-800 bg-surface-2 p-[10px_12px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-zinc-500">
                  {d.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  {TYPE_LABELS[d.type] ?? d.type}
                </span>
              </div>
              <div className="font-display text-base font-semibold text-zinc-200">
                {d.totalToday ?? "—"}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                {d.totalToday
                  ? d.apps.map((a) => a.name).join(", ")
                  : "данные не доступны"}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasAggregate && (
        <>
          <div className="flex h-8 items-end gap-[3px]">
            {data.weekDays.map((d) => (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-[3px]"
              >
                <div
                  className={`w-full rounded-t min-h-[3px] ${
                    d.today
                      ? "bg-accent"
                      : d.over
                        ? "bg-red-400/70"
                        : "bg-zinc-700/50"
                  }`}
                  style={{ height: d.height }}
                />
                <span className="font-mono text-[10px] text-zinc-500">
                  {d.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-[5px]">
            {data.apps.map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <span className="w-[90px] flex-shrink-0 truncate text-xs text-zinc-200" title={a.name}>
                  {a.name}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-sm bg-zinc-800">
                  <div
                    className="h-full rounded-sm"
                    style={{ width: a.width, background: a.color, opacity: 0.7 }}
                  />
                </div>
                <span className="w-[34px] text-right font-mono text-[10px] text-zinc-500">
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
