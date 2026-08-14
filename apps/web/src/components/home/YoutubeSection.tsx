"use client";

import { useYouTube } from "@/hooks/useYouTube";
import { useWatched } from "@/hooks/useWatched";
import { SectionCard, CardSkeleton } from "./SectionCard";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "только что";
  if (h < 24) return `${h}ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}д назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

export function YoutubeSection() {
  const { videos, loading } = useYouTube();
  const { watched } = useWatched();

  const unwatchedCount = videos.filter((v) => !watched.has(v.id)).length;
  const recent = videos.slice(0, 3);

  return (
    <SectionCard
      href="/youtube"
      icon="▷"
      title="YouTube"
      badge={
        !loading && unwatchedCount > 0 ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-light">
            {unwatchedCount} новых
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col gap-2.5">
          <CardSkeleton className="h-[46px] w-full" />
          <CardSkeleton className="h-[46px] w-full" />
        </div>
      ) : recent.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">Нет новых видео</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((v) => {
            const isWatched = watched.has(v.id);
            return (
              <div
                key={v.id}
                className={`flex items-center gap-2.5 ${isWatched ? "opacity-40" : ""}`}
              >
                <div className="h-[34px] w-[54px] flex-shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                  {v.thumb ? (
                    <img
                      src={v.thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                      {isWatched ? "✓" : "▷"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] leading-tight text-zinc-200">
                    {v.title}
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                    {v.channel} · {timeAgo(v.publishedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
