export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold text-zinc-100">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
