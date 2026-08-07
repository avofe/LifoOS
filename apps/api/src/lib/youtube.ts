let youtubeKey: string | null = null;

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
