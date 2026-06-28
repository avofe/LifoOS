"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiFetch } from "@/lib/api";

const LS_KEY = "yt_watched";

export function useWatched(): {
  watched: Set<string>;
  markWatched: (id: string) => void;
  markAllWatched: () => void;
  loading: boolean;
} {
  const [watched, setWatched] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<string[]>("/api/video-state/watched").then((ids) => {
      if (ids && ids.length > 0) {
        setWatched((prev) => {
          const merged = new Set([...prev, ...ids]);
          localStorage.setItem(LS_KEY, JSON.stringify([...merged]));
          return merged;
        });
      }
      setLoading(false);
    });
  }, []);

  const markWatched = useCallback((id: string) => {
    setWatched((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      apiFetch("/api/video-state/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id }),
        silent: true,
      }).catch(() => {});
      return next;
    });
  }, []);

  const markAllWatched = useCallback(() => {
    const current = watched;
    if (current.size === 0) return;

    setWatched(new Set());
    localStorage.removeItem(LS_KEY);

    apiFetch("/api/video-state/watched/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: [...current] }),
      silent: true,
    }).catch(() => {});
  }, [watched]);

  return { watched, markWatched, markAllWatched, loading };
}
