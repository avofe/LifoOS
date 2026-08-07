"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useYouTube } from "@/hooks/useYouTube";
import type { SubsStats, TwitchStreamer, ScreenTimeData } from "@lifeos/types";

export function StatsGrid() {
  const [subsStats, setSubsStats] = useState<SubsStats | null>(null);
  const [twitchData, setTwitchData] = useState<TwitchStreamer[]>([]);
  const [screenTime, setScreenTime] = useState<ScreenTimeData | null>(null);
  const { videos: ytVideos, loading: ytLoading } = useYouTube();

  useEffect(() => {
    apiGet<SubsStats>("/api/subscriptions/stats").then(setSubsStats);
  }, []);

  useEffect(() => {
    apiGet<TwitchStreamer[]>("/api/twitch/streams").then((d) => setTwitchData(d ?? []));
  }, []);

  useEffect(() => {
    apiGet<ScreenTimeData>("/api/screentime").then((d) => setScreenTime(d ?? null));
  }, []);

  const ytCount = ytVideos.length;
  const onlineCount = twitchData.filter((s) => s.online).length;
  const totalTracked = twitchData.length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Сегодня на экране"
        value={screenTime ? (screenTime.totalToday ?? "—") : "..."}
        subtitle={screenTime && screenTime.totalToday ? screenTime.apps.map((a) => a.name).join(", ") : undefined}
      />
      <Stat
        label="Подписки / месяц"
        value={subsStats ? `${subsStats.monthlyTotal.toLocaleString("ru-RU")} ₽` : "..."}
        subtitle={subsStats ? `${subsStats.total} сервисов` : undefined}
      />
      <Stat
        label="Новый контент"
        value={ytLoading ? "..." : String(ytCount)}
        subtitle={ytCount > 0 ? "новых видео" : ytLoading ? undefined : "нет новых видео"}
      />
      <Stat
        label="Twitch"
        value={twitchData.length > 0 ? String(onlineCount) : "..."}
        subtitle={
          totalTracked > 0
            ? onlineCount > 0
              ? `${onlineCount} из ${totalTracked} онлайн`
              : `${totalTracked} стримеров`
            : undefined
        }
        pill={onlineCount > 0 ? "● онлайн" : undefined}
        pillVariant="live"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  subtitle,
  pill,
  pillVariant,
}: {
  label: string;
  value: string;
  subtitle?: string;
  pill?: string;
  pillVariant?: "warn" | "live" | "up" | "down";
}) {
  const pillStyles: Record<string, string> = {
    warn: "bg-orange-500/10 text-orange-400",
    live: "bg-emerald-500/10 text-emerald-400",
    up: "bg-emerald-500/10 text-emerald-400",
    down: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="flex cursor-default flex-col gap-1.5 rounded-xl border border-zinc-800 bg-surface p-4 transition hover:border-zinc-700/50">
      <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="font-display text-xl font-semibold leading-none text-zinc-200">
        {value}
      </div>
      {subtitle && <div className="text-[11px] text-zinc-500">{subtitle}</div>}
      {pill && (
        <div className={`mt-0.5 w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${pillStyles[pillVariant ?? "warn"]}`}>
          {pill}
        </div>
      )}
    </div>
  );
}
