export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 bg-black p-6">
      <div className="h-5 w-24 animate-pulse rounded bg-zinc-700" />
      <div className="h-48 animate-pulse rounded-xl bg-surface" />
      <div className="h-36 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
