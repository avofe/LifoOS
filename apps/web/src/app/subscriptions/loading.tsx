export default function SubsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 bg-black p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 w-28 animate-pulse rounded bg-zinc-700" />
          <div className="mt-1 h-3 w-20 animate-pulse rounded bg-zinc-700" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-surface" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
