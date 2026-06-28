"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import type { YouTubeVideo } from "@lifeos/types";

export type { YouTubeVideo };

let fetchPromise: Promise<YouTubeVideo[]> | null = null;
let cachedData: YouTubeVideo[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 3_600_000;

async function getVideos(): Promise<YouTubeVideo[]> {
  const now = Date.now();

  if (cachedData && now - cachedAt < CACHE_TTL) {
    return cachedData;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = apiGet<YouTubeVideo[]>("/api/youtube/videos")
    .then((data) => {
      const result = data ?? [];
      cachedData = result;
      cachedAt = Date.now();
      fetchPromise = null;
      return result;
    })
    .catch((err) => {
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

function invalidateCache() {
  cachedAt = 0;
  fetchPromise = null;
}

function hasFreshCache(): boolean {
  return cachedData !== null && Date.now() - cachedAt < CACHE_TTL;
}

export function useYouTube() {
  const [videos, setVideos] = useState<YouTubeVideo[]>(() => {
    if (hasFreshCache()) return cachedData!;
    return [];
  });
  const [loading, setLoading] = useState(!hasFreshCache());

  const fetch = useCallback(() => {
    let cancelled = false;

    getVideos()
      .then((data) => {
        if (!cancelled) {
          setVideos(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetch(), [fetch]);

  const refresh = useCallback(() => {
    invalidateCache();
    setLoading(true);
    fetch();
  }, [fetch]);

  return { videos, loading, refresh };
}
