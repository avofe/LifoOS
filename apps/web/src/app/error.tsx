"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <div className="text-2xl">⚠</div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Что-то пошло не так
        </p>
        <button
          onClick={reset}
          className="rounded-lg border border-accent/30 bg-accent-bg px-4 py-2 text-xs font-medium text-accent-light transition hover:bg-accent/20"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
