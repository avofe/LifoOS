"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { TwitchStreamer } from "@lifeos/types";
import { SectionCard, CardSkeleton } from "./SectionCard";

function fmtViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}к`;
  return String(n);
}

export function TwitchSection() {
  const [streamers, setStreamers] = useState<TwitchStreamer[] | null>(null);

  const fetchData = useCallback(() => {
    apiGet<TwitchStreamer[]>("/api/twitch/streams").then((d) => setStreamers(d ?? []));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const online = (streamers ?? []).filter((s) => s.online);

  return (
    <SectionCard
      href="/twitch"
      icon="◉"
      title="Twitch"
      badge={
        streamers !== null && online.length > 0 ? (
          <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        ) : undefined
      }
    >
      {streamers === null ? (
        <div className="flex flex-col gap-2.5">
          <CardSkeleton className="h-[40px] w-full" />
          <CardSkeleton className="h-[40px] w-full" />
        </div>
      ) : streamers.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">Нет отслеживаемых стримеров</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-2xl font-bold leading-none text-zinc-100">
              {online.length}
            </span>
            <span className="text-[11px] text-zinc-500">
              онлайн из {streamers.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {(online.length > 0 ? online.slice(0, 3) : streamers.slice(0, 3)).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="truncate text-zinc-200">{s.displayName}</span>
                {s.online ? (
                  <span className="shrink-0 font-mono text-[10px] text-emerald-400">
                    {s.game ?? ""} · {fmtViewers(s.viewers)}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-zinc-600">офлайн</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
