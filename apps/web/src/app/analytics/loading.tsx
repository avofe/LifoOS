export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-6xl flex-1 bg-zinc-900 px-8 py-6">
      <div className="mb-6">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-700" />
        <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-700" />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>

      <div className="mb-6">
        <div className="mb-4 h-3 w-36 animate-pulse rounded bg-zinc-700" />
        <div className="h-[220px] animate-pulse rounded-xl bg-surface" />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <div className="mb-3 h-3 w-44 animate-pulse rounded bg-zinc-700" />
          <div className="h-[260px] animate-pulse rounded-xl bg-surface" />
        </div>
        <div className="col-span-3">
          <div className="mb-3 h-3 w-32 animate-pulse rounded bg-zinc-700" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-zinc-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-zinc-700" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-700" />
                </div>
                <div className="h-1.5 animate-pulse rounded-full bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
