"use client";

export function SectionCard({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-sm text-accent-light">
            {icon}
          </span>
          <h2 className="label text-zinc-200">{title}</h2>
        </div>
        {subtitle && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {subtitle}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}
