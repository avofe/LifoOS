"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { ScreenTimeData } from "@lifeos/types";

export function ScreenTimeCard() {
  const [data, setData] = useState<ScreenTimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ScreenTimeData>("/api/screentime")
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="font-display text-[13px] font-semibold text-zinc-200">
            Экранное время
          </span>
          <span className="font-display text-[13px] font-medium text-zinc-500">
            Загрузка...
          </span>
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-display text-[13px] font-semibold text-zinc-200">
          Экранное время
        </span>
        <span className="font-display text-[13px] font-medium text-zinc-500">
          Сегодня: <b className="text-zinc-200">{data.totalToday}</b>
        </span>
      </div>

      <div className="mb-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-zinc-800 bg-surface-2 p-[10px_12px]">
          <div className="text-[11px] text-zinc-500">ПК</div>
          <div className="font-display text-base font-semibold text-zinc-200">
            {data.totalToday}
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">
            {data.apps.map((a) => a.name).join(", ")}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-surface-2 p-[10px_12px]">
          <div className="text-[11px] text-zinc-500">Телефон</div>
          <div className="font-display text-base font-semibold text-zinc-200">
            —
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">
            данные не доступны
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-surface-2 p-[10px_12px]">
          <div className="text-[11px] text-zinc-500">Планшет</div>
          <div className="font-display text-base font-semibold text-zinc-200">
            —
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">
            данные не доступны
          </div>
        </div>
      </div>

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
            <span className="font-mono text-[8px] text-zinc-500">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-[5px]">
        {data.apps.map((a) => (
          <div key={a.name} className="flex items-center gap-2">
            <span className="w-[90px] flex-shrink-0 text-xs text-zinc-200">
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
    </div>
  );
}
