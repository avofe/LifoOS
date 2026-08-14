import Link from "next/link";

export function SectionCard({
  href,
  icon,
  title,
  badge,
  children,
  className,
}: {
  href: string;
  icon: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`card group flex flex-col p-[16px_18px] transition hover:border-zinc-700/70 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm leading-none text-zinc-500">{icon}</span>
          <span className="truncate font-display text-[13px] font-semibold text-zinc-200 transition group-hover:text-accent-light">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <span className="text-xs text-zinc-600 transition group-hover:text-accent-light">→</span>
        </div>
      </div>
      {children}
    </Link>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/60 ${className ?? ""}`} />;
}

export function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}м`;
  return m === 0 ? `${h}ч` : `${h}ч ${m}м`;
}
