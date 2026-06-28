"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import type { TwitchStreamer } from "@lifeos/types";

export default function TwitchPage() {
  const [streamers, setStreamers] = useState<TwitchStreamer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    apiGet<TwitchStreamer[]>("/api/twitch/streams")
      .then((data) => {
        setStreamers(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const online = streamers.filter((s) => s.online);
  const offline = streamers.filter((s) => !s.online);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 bg-black p-6">
      {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-200">
                Twitch · стримеры
              </h1>
              <p className="text-xs text-zinc-500">
                {loading
                  ? "Загрузка..."
                  : `${online.length} онлайн · ${offline.length} офлайн`}
              </p>
            </div>
            <a
              href="https://twitch.tv/directory/following"
              className="rounded-lg border border-zinc-800 bg-surface-2 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Открыть Twitch
            </a>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
                <span className="text-xs text-zinc-600">Загрузка...</span>
              </div>
            </div>
          )}

          {/* Online */}
          {!loading && online.length > 0 && (
            <section>
              <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Онлайн · {online.length}
              </h2>
              <div className="grid gap-3">
                {online.map((s) => (
                  <StreamerCard key={s.id} streamer={s} />
                ))}
              </div>
            </section>
          )}

          {/* Offline */}
          {!loading && offline.length > 0 && (
            <section>
              <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Офлайн · {offline.length}
              </h2>
              <div className="grid gap-2">
                {offline.map((s) => (
                  <StreamerCard key={s.id} streamer={s} />
                ))}
              </div>
            </section>
          )}

          {!loading && streamers.length === 0 && (
            <p className="py-20 text-center text-sm text-zinc-600">
              Нет данных о стримерах
            </p>
          )}
        </div>
  );
}

function StreamerCard({ streamer }: { streamer: TwitchStreamer }) {
  return (
    <a
      href={`https://twitch.tv/${streamer.login}`}
      className={`group flex items-center gap-4 rounded-xl border p-4 transition ${
        streamer.online
          ? "border-indigo-500/20 bg-indigo-500/[0.03] hover:border-indigo-500/40"
          : "border-zinc-800 bg-zinc-900/30 opacity-60 hover:border-zinc-700 hover:opacity-80"
      }`}
    >
      {/* Avatar */}
      <div
        className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
          streamer.online
            ? "bg-indigo-500/20 text-indigo-300"
            : "bg-zinc-700/50 text-zinc-500"
        }`}
      >
        {streamer.displayName[0]}
        {streamer.online && (
          <span className="absolute inset-[-2px] animate-ring rounded-full border border-emerald-400" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200 group-hover:text-accent-light transition">
            {streamer.displayName}
          </span>
          {streamer.online && (
            <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </span>
          )}
          {!streamer.online && (
            <span className="text-[10px] text-zinc-600">офлайн</span>
          )}
        </div>

        {streamer.online ? (
          <>
            <div className="mt-0.5 text-xs text-zinc-400 line-clamp-1">
              {streamer.title}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
              {streamer.game && (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5">
                  {streamer.game}
                </span>
              )}
              <span>{formatViewers(streamer.viewers)} зрителей</span>
              <span>{streamer.uptime}</span>
            </div>
          </>
        ) : (
          <div className="mt-1 text-xs text-zinc-600">
            {streamer.game && `${streamer.game} · `}
            {streamer.viewers > 0
              ? `${formatViewers(streamer.viewers)} зрителей`
              : ""}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 text-zinc-600 transition group-hover:text-zinc-400">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </div>
    </a>
  );
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}к`;
  return String(n);
}
