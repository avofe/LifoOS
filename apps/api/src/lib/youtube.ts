import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";

const YT_API = "https://www.googleapis.com/youtube/v3";

let youtubeKey: string | null = null;

let cache: { data: any[]; ts: number } | null = null;
const CACHE_TTL = 3_600_000; // 1 hour

export function initYouTube(apiKey: string) {
  youtubeKey = apiKey.trim() || null;
  console.log("[youtube] API key set");
}

export function reinitYouTube(apiKey: string) {
  youtubeKey = apiKey.trim() || null;
  console.log("[youtube] API key updated");
}

export function getYouTubeKey(): string {
  return youtubeKey ?? "";
}

export function hasYouTubeKey(): boolean {
  return !!youtubeKey;
}

async function getTrackedChannels(): Promise<{ id: string; name: string }[]> {
  const integ = await prisma.integration.findUnique({
    where: { userId_service: { userId: USER_ID, service: "youtube" } },
  });
  if (!integ?.config || !Array.isArray((integ.config as any).channels)) {
    return [];
  }
  return (integ.config as any).channels as { id: string; name: string }[];
}

export function invalidateYouTubeCache() {
  cache = null;
}

export async function fetchNewVideos(): Promise<any[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  if (!hasYouTubeKey()) return [];

  const apiKey = getYouTubeKey();
  const tracked = await getTrackedChannels();
  if (tracked.length === 0) return [];

  const results = await Promise.allSettled(
    tracked.map(async (ch) => {
      const playlistId = "UU" + ch.id.slice(2);
      const url = `${YT_API}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=3&key=${apiKey}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return { channel: ch.name, videos: [] };

      const json: any = await r.json();
      const videos = (json.items ?? [])
        .filter((item: any) => item.snippet?.resourceId?.videoId)
        .map((item: any) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          channel: ch.name,
          channelId: ch.id,
          publishedAt: item.snippet.publishedAt,
          thumb:
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url ??
            null,
        }));

      return { channel: ch.name, videos };
    })
  );

  const allVideos = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r: any) => r.value.videos)
    .sort(
      (a: any, b: any) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 15);

  cache = { data: allVideos, ts: Date.now() };
  return allVideos;
}
