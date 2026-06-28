import { useState } from "react";

type StepData = {
  name: string;
  category: string;
  cost: string;
  billingCycle: "monthly" | "yearly";
  nextPaymentAt: string;
  notes: string;
};

type Props = {
  onClose: () => void;
  onSave: (data: StepData) => void;
  initial?: StepData;
};

const STEPS = ["Название", "Стоимость", "Оплата", "Проверка"];

const CATEGORIES = [
  "Hosting",
  "Music",
  "Video",
  "Security",
  "AI",
  "Cloud",
  "Games",
  "Other",
];

const defaultData: StepData = {
  name: "",
  category: "",
  cost: "",
  billingCycle: "monthly",
  nextPaymentAt: "",
  notes: "",
};

export function SubscriptionFormModal({ onClose, onSave, initial }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>(initial ?? defaultData);

  function update(fields: Partial<StepData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  function handleNext() {
    if (step === 0 && !data.name.trim()) return;
    if (step === 1 && (!data.cost || Number(data.cost) <= 0)) return;
    if (step === 2 && !data.nextPaymentAt) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleSave() {
    onSave(data);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Steps indicator */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i === step
                    ? "bg-indigo-500 text-white"
                    : i < step
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 ${
                    i < step ? "bg-indigo-500/50" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Название подписки
              </label>
              <input
                autoFocus
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="например: Spotify"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Категория
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      update({
                        category: data.category === cat ? "" : cat,
                      })
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      data.category === cat
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Стоимость
            </label>
            <div className="relative">
              <input
                autoFocus
                type="number"
                min={1}
                value={data.cost}
                onChange={(e) => update({ cost: e.target.value })}
                placeholder="990"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pr-12 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                ₽
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Только рубли (RUB)
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Периодичность
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => update({ billingCycle: "monthly" })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    data.billingCycle === "monthly"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Ежемесячно
                </button>
                <button
                  onClick={() => update({ billingCycle: "yearly" })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    data.billingCycle === "yearly"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  Ежегодно
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Дата следующего платежа
              </label>
              <input
                autoFocus
                type="date"
                value={data.nextPaymentAt}
                min={today}
                onChange={(e) => update({ nextPaymentAt: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Заметка (необязательно)
              </label>
              <input
                value={data.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="например: платит друг"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Проверка данных
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <ReviewRow label="Название" value={data.name} />
                <ReviewRow label="Категория" value={data.category || "—"} />
                <ReviewRow
                  label="Стоимость"
                  value={`${Number(data.cost).toLocaleString("ru-RU")} ₽`}
                />
                <ReviewRow
                  label="Период"
                  value={
                    data.billingCycle === "monthly"
                      ? "Ежемесячно"
                      : "Ежегодно"
                  }
                />
                <ReviewRow
                  label="Следующий платёж"
                  value={new Date(data.nextPaymentAt).toLocaleDateString(
                    "ru-RU",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                />
                {data.notes && (
                  <ReviewRow label="Заметка" value={data.notes} />
                )}
              </div>
            </div>
            <p className="text-xs text-zinc-600">
              Всё верно? Нажми «Сохранить» или вернись назад.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Отмена
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                Назад
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                Сохранить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}
