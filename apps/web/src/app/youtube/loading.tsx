export default function YoutubeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 bg-black p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 w-36 animate-pulse rounded bg-zinc-700" />
          <div className="mt-1 h-3 w-28 animate-pulse rounded bg-zinc-700" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-surface" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-7 w-28 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-video animate-pulse rounded-lg bg-surface" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-700" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
