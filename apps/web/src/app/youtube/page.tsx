"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiFetch } from "@/lib/api";
import { useYouTube } from "@/hooks/useYouTube";
import { useWatched } from "@/hooks/useWatched";
import type { TrackedChannel, YouTubeSearchResult as SearchResult } from "@lifeos/types";

export default function YouTubePage() {
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const { videos, loading, refresh } = useYouTube();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showManage, setShowManage] = useState(false);
  const { watched, markWatched, markAllWatched } = useWatched();
  const [searchVideo, setSearchVideo] = useState("");

  const fetchChannels = useCallback(() => {
    apiGet<TrackedChannel[]>("/api/youtube/channels")
      .then((d) => setChannels(d ?? []));
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      apiGet<SearchResult[]>(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`)
        .then((d) => setSearchResults(d ?? []));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function addChannel(ch: SearchResult) {
    try {
      await apiFetch("/api/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ch.id, name: ch.name }),
      });
      fetchChannels();
      refresh();
      setSearchQuery("");
      setSearchResults([]);
    } catch {}
  }

  async function removeChannel(id: string) {
    try {
      await apiFetch(`/api/youtube/channels/${id}`, { method: "DELETE" });
      fetchChannels();
      refresh();
    } catch {}
  }

  const unwatchedCount = videos.filter((v) => !watched.has(v.id)).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 bg-black p-6">
      {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-200">
                YouTube · новые видео
              </h1>
              <p className="text-xs text-zinc-500">
                {loading
                  ? "Загрузка..."
                  : `${videos.length} видео · ${unwatchedCount} непросмотренных`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!loading && unwatchedCount > 0 && (
                <button
                  onClick={markAllWatched}
                  className="rounded-lg border border-zinc-800 bg-surface-2 px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-200"
                >
                  Все просмотрено
                </button>
              )}
              <button
                onClick={() => setShowManage(!showManage)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  showManage
                    ? "border-accent bg-accent-bg text-accent-light"
                    : "border-zinc-800 bg-surface-2 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {showManage ? "Готово" : "Каналы"}
              </button>
              <a
                href="https://youtube.com"
                className="rounded-lg border border-zinc-800 bg-surface-2 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Открыть YouTube
              </a>
            </div>
          </div>

          {/* Manage Channels */}
          {showManage && (
            <div className="rounded-xl border border-zinc-800 bg-surface p-4">
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                Мои каналы
              </h2>

              {/* Tracked channels */}
              <div className="mb-3 flex flex-wrap gap-2">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-surface-2 px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {ch.name}
                    <button
                      onClick={() => removeChannel(ch.id)}
                      className="text-zinc-600 hover:text-red-400 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск канала..."
                  className="w-full rounded-lg border border-zinc-700/50 bg-surface-2 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-accent"
                />
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-zinc-700/50 bg-surface-2 p-1">
                  {searchResults.map((ch) => {
                    const alreadyTracked = channels.some(
                      (c) => c.id === ch.id
                    );
                    return (
                      <button
                        key={ch.id}
                        onClick={() => !alreadyTracked && addChannel(ch)}
                        disabled={alreadyTracked}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                          alreadyTracked
                            ? "cursor-not-allowed text-zinc-600"
                            : "text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {ch.thumb && (
                          <img
                            src={ch.thumb}
                            alt=""
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                        <span>{ch.name}</span>
                        {alreadyTracked && (
                          <span className="ml-auto text-zinc-600">
                            добавлен
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchVideo.trim()) {
                window.open(
                  `https://youtube.com/results?search_query=${encodeURIComponent(searchVideo.trim())}`,
                  "_blank"
                );
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={searchVideo}
              onChange={(e) => setSearchVideo(e.target.value)}
              placeholder="Поиск видео на YouTube..."
              className="flex-1 rounded-lg border border-zinc-700/50 bg-surface-2 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg border border-accent bg-accent-bg px-4 py-2 text-sm text-accent-light transition hover:brightness-110"
            >
              Искать
            </button>
          </form>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
                <span className="text-xs text-zinc-600">Загрузка...</span>
              </div>
            </div>
          )}

          {/* Videos grid */}
          {!loading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.map((v) => {
                const isWatched = watched.has(v.id);
                return (
                  <a
                    key={v.id}
                    href={`https://youtube.com/watch?v=${v.id}`}
                    onClick={() => markWatched(v.id)}
                    className={`group flex gap-3 rounded-xl border p-3 transition ${
                      isWatched
                        ? "border-zinc-800/50 bg-zinc-900/10 opacity-50 hover:opacity-80"
                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-[68px] w-[120px] flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                      {v.thumb && (
                        <img
                          src={v.thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {isWatched && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-lg text-zinc-500">✓</span>
                        </div>
                      )}
                      {!isWatched && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <span className="text-lg">▶</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-medium leading-snug line-clamp-2 transition ${
                        isWatched
                          ? "text-zinc-500"
                          : "text-zinc-200 group-hover:text-accent-light"
                      }`}>
                        {v.title}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {v.channel}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        {formatTimeAgo(v.publishedAt)}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {!loading && videos.length === 0 && (
            <p className="py-20 text-center text-sm text-zinc-600">
              Нет новых видео
            </p>
          )}
        </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "меньше часа назад";
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU");
}
