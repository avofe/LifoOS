type Props = {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentAt: string;
  category: string | null;
  notes: string | null;
  daysUntilPayment: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SubscriptionCard(props: Props) {
  const urgent = props.daysUntilPayment <= 3 && props.daysUntilPayment >= 0;
  const overdue = props.daysUntilPayment < 0;

  const pillText = overdue
    ? `просрочена на ${Math.abs(props.daysUntilPayment)} дн.`
    : props.daysUntilPayment === 0
      ? "сегодня"
      : `через ${props.daysUntilPayment} дн.`;

  const pillClass = overdue
    ? "bg-red-500/10 text-red-400"
    : urgent
      ? "bg-orange-500/10 text-orange-400"
      : "bg-zinc-800 text-zinc-400";

  const cycleLabel = props.billingCycle === "yearly" ? "в год" : "в месяц";
  const dateStr = new Date(props.nextPaymentAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{props.name}</span>
          {props.category && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {props.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{dateStr}</span>
          <span>{cycleLabel}</span>
          {props.notes && <span>· {props.notes}</span>}
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold text-zinc-200">
            {props.cost.toLocaleString("ru-RU")} ₽
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${pillClass}`}>
            {pillText}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => props.onEdit(props.id)}
            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            Изменить
          </button>
          <button
            onClick={() => props.onDelete(props.id)}
            className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/20"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
