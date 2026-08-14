export default function TwitchLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-black p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-700" />
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-700" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-surface" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-surface p-4">
            <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-zinc-700" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 h-4 w-28 animate-pulse rounded bg-zinc-700" />
              <div className="mb-1 h-3 w-48 animate-pulse rounded bg-zinc-700" />
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
