"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { AnalyticsData, ScreenLimitsData, ScreenTimeData, StreakStatus } from "@lifeos/types";
import { SectionCard, CardSkeleton, fmtDuration } from "./SectionCard";

export function ScreenTimeSection() {
  const [st, setSt] = useState<ScreenTimeData | null>(null);
  const [limits, setLimits] = useState<ScreenLimitsData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [streak, setStreak] = useState<StreakStatus | null>(null);

  const fetchData = useCallback(() => {
    apiGet<ScreenTimeData>("/api/screentime").then((d) => setSt(d));
    apiGet<ScreenLimitsData>("/api/screentime/limits").then((d) => setLimits(d));
    apiGet<AnalyticsData>("/api/screentime/analytics?days=14").then((d) => setAnalytics(d));
    apiGet<StreakStatus>("/api/screentime/streak").then((d) => setStreak(d));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const loading = !st;

  const limit = limits?.total ?? null;
  const limitPct =
    limit && limit.limitMin !== null && limit.limitMin > 0
      ? Math.min(100, Math.round((limit.usedSec / (limit.limitMin * 60)) * 100))
      : null;

  const diff = analytics?.weekComparison?.diffPercent;

  return (
    <SectionCard
      href="/analytics"
      icon="◷"
      title="Экранное время"
      badge={
        limitPct !== null && limit?.over ? (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
            превышен
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <CardSkeleton className="h-6 w-1/2" />
          <CardSkeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-2xl font-bold leading-none text-zinc-100">
                {st.totalToday ?? "—"}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {st.apps.length > 0
                  ? st.apps.slice(0, 2).map((a) => a.name).join(", ")
                  : "данных пока нет"}
              </div>
            </div>
            {diff !== null && diff !== undefined && (
              <div
                className={`shrink-0 text-right font-mono text-[11px] font-semibold ${
                  diff > 0 ? "text-red-400" : diff < 0 ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                {diff > 0 ? "▲" : diff < 0 ? "▼" : "•"} {Math.abs(diff)}% за 7 дней
              </div>
            )}
          </div>

          {st.weekDays.length > 0 && (
            <>
              <div className="flex h-8 items-end gap-[3px]">
                {st.weekDays.map((d) => (
                  <div
                    key={d.label}
                    title={d.incomplete ? "данные неполные (вечер не записан)" : d.label}
                    className="flex flex-1 flex-col items-center gap-[3px]"
                  >
                    <div
                      className={`w-full rounded-t min-h-[3px] ${
                        d.today
                          ? "bg-accent"
                          : d.over
                            ? "bg-red-400/70"
                            : d.incomplete
                              ? "bg-zinc-700/25"
                              : "bg-zinc-700/50"
                      }`}
                      style={{ height: d.height }}
                    />
                    <span
                      className={`font-mono text-[9px] ${d.incomplete ? "text-zinc-700" : "text-zinc-500"}`}
                    >
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
              {st.weekDays.some((d) => d.incomplete) && (
                <div className="text-[10px] text-amber-400/80">
                  ⚠ часть дней с неполными данными
                </div>
              )}
            </>
          )}

          {streak?.enabled && (
            <div
              className={`flex flex-wrap items-center gap-x-1.5 text-[11px] ${
                streak.streak > 0 ? "text-emerald-400/90" : "text-zinc-400"
              }`}
            >
              <span>🔥</span>
              <span className="font-mono font-semibold">{streak.streak}</span>
              <span className="text-zinc-500">дней подряд</span>
              {streak.record > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="text-zinc-500">
                    рекорд <b className="font-mono text-zinc-400">{streak.record}</b>
                  </span>
                </>
              )}
              {streak.streak === 0 && (
                <span className="text-red-400/80">— сегодня выше лимита</span>
              )}
            </div>
          )}

          {st.forecast && (
            <div className="rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 text-[11.5px] text-zinc-400">
              {st.forecast.projected !== null && (
                <>
                  При текущем темпе к полуночи будет{" "}
                  <b className="font-mono text-zinc-200">{st.forecast.projected}</b>
                </>
              )}
            </div>
          )}

          {limitPct !== null && (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-sm bg-zinc-800">
                <div
                  className={`h-full rounded-sm ${limit?.over ? "bg-red-400/80" : "bg-accent"}`}
                  style={{ width: `${limitPct}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                {limitPct}% · лимит {limit?.limitMin ? fmtDuration(limit.limitMin * 60) : ""}
                {limits?.total.source === "devices" ? " (устройства)" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
