"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import type { YouTubeVideo } from "@lifeos/types";

export function YouTubeFeed() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    apiGet<YouTubeVideo[]>("/api/youtube/videos")
      .then((data) => {
        setVideos(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 300_000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface p-4">
        <div className="mb-3 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          YouTube · последние видео
        </div>
        <div className="py-6 text-center text-xs text-zinc-600">Загрузка...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface p-4">
      <div className="mb-3 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        YouTube · последние видео
      </div>
      <div className="flex flex-col gap-2">
        {videos.slice(0, 5).map((v) => (
          <a
            key={v.id}
            href={`https://youtube.com/watch?v=${v.id}`}
            className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-2.5 transition hover:border-zinc-700"
          >
            <div className="h-[50px] w-[88px] flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
              {v.thumb && (
                <img
                  src={v.thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium leading-snug text-zinc-200 line-clamp-2 group-hover:text-accent-light transition">
                {v.title}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                <span>{v.channel}</span>
                <span>·</span>
                <span>{formatTimeAgo(v.publishedAt)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "только что";
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU");
}
