"use client";

export default function TwitchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 bg-black p-6">
      <p className="text-sm text-red-400">Не удалось загрузить Twitch</p>
      <button
        onClick={reset}
        className="rounded-lg border border-accent/30 bg-accent-bg px-4 py-2 text-xs font-medium text-accent-light transition hover:bg-accent/20"
      >
        Попробовать снова
      </button>
    </div>
  );
}
