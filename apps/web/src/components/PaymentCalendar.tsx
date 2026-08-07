"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import type { PaymentCalendarData } from "@lifeos/types";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtCost(cost: number, currency: string): string {
  if (currency === "RUB") return `${cost.toLocaleString("ru-RU")} ₽`;
  return `${cost.toFixed(2)}${currency === "USD" ? "$" : "€"}`;
}

export function PaymentCalendar() {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [data, setData] = useState<PaymentCalendarData | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const key = monthKey(month);

  useEffect(() => {
    setData(null);
    setSelectedDay(null);
    apiGet<PaymentCalendarData>(`/api/subscriptions/calendar?month=${key}`).then((d) => {
      setData(d ?? null);
    });
  }, [key]);

  const cells = useMemo(() => {
    const firstOffset = (month.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return { firstOffset, daysInMonth };
  }, [month]);

  const dayMap = useMemo(() => {
    const map = new Map<number, PaymentCalendarData["days"][number]>();
    for (const d of data?.days ?? []) map.set(d.day, d);
    return map;
  }, [data]);

  const isTodayMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const selected = selectedDay !== null ? dayMap.get(selectedDay) : undefined;

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[13px] font-semibold text-zinc-200">
          Календарь платежей
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {data ? `${fmtCost(data.total, "RUB")} в месяц` : "..."}
          </span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-surface-2 hover:text-accent-light"
            title="Предыдущий месяц"
          >
            ←
          </button>
          <span className="w-28 text-center text-xs font-medium text-zinc-300">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-surface-2 hover:text-accent-light"
            title="Следующий месяц"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-1 text-center font-mono text-[9.5px] font-bold uppercase tracking-wider text-zinc-600"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: cells.firstOffset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: cells.daysInMonth }).map((_, i) => {
          const day = i + 1;
          const entry = dayMap.get(day);
          const isToday = isTodayMonth && day === today.getDate();
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 transition ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : entry
                    ? "border-zinc-700 bg-surface-2 hover:border-accent/40"
                    : isToday
                      ? "border-zinc-700/60 bg-zinc-800/40 hover:border-accent/40"
                      : "border-transparent hover:bg-surface-2"
              }`}
            >
              <span
                className={`font-mono text-[11px] ${
                  isToday ? "font-bold text-accent-light" : "text-zinc-400"
                }`}
              >
                {day}
              </span>
              {entry && (
                <span
                  className={`text-[9px] font-medium ${
                    entry.total >= 1000 ? "text-orange-400" : "text-zinc-500"
                  }`}
                >
                  {entry.items.length} плат.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-surface-2 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {selected.day} {MONTHS[month.getMonth()].toLowerCase()} · {fmtCost(selected.total, "RUB")}
          </div>
          {selected.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">{it.name}</span>
              <span className="font-mono text-zinc-400">{fmtCost(it.cost, it.currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
