export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          LifoOS
        </p>
      </div>
    </div>
  );
}
