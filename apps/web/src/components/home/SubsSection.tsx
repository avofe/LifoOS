"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { PaymentCalendarData, SubsStats, Subscription } from "@lifeos/types";
import { SectionCard, CardSkeleton } from "./SectionCard";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtCost(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

export function SubsSection() {
  const [stats, setStats] = useState<SubsStats | null>(null);
  const [upcoming, setUpcoming] = useState<Subscription[]>([]);
  const [calendar, setCalendar] = useState<PaymentCalendarData | null>(null);

  const fetchData = useCallback(() => {
    apiGet<SubsStats>("/api/subscriptions/stats").then((d) => setStats(d));
    apiGet<Subscription[]>("/api/subscriptions?upcomingDays=31").then((d) =>
      setUpcoming(d ?? [])
    );
    apiGet<PaymentCalendarData>(`/api/subscriptions/calendar?month=${monthKey(new Date())}`)
      .then((d) => setCalendar(d));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const next = upcoming[0];

  const now = new Date();
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayMap = new Map<number, PaymentCalendarData["days"][number]>();
  for (const d of calendar?.days ?? []) dayMap.set(d.day, d);

  const loading = !stats;

  return (
    <SectionCard
      href="/subscriptions"
      icon="◈"
      title="Подписки"
      badge={
        next && next.daysUntilPayment <= 2 ? (
          <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
            {next.daysUntilPayment === 0 ? "сегодня" : `через ${next.daysUntilPayment} дн`}
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <CardSkeleton className="h-6 w-1/2" />
          <CardSkeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-2xl font-bold leading-none text-zinc-100">
                {stats ? fmtCost(stats.monthlyTotal) : "—"}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {stats
                  ? `${stats.total} сервисов · ${fmtCost(stats.yearlyTotal)} в год`
                  : ""}
              </div>
            </div>
          </div>

          {next && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2">
              <span className="truncate text-[12px] text-zinc-200">{next.name}</span>
              <span className="shrink-0 pl-2 text-[11px] text-zinc-500">
                {new Date(next.nextPaymentAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {fmtCost(next.cost)}
              </span>
            </div>
          )}

          {calendar && (
            <div className="flex items-end gap-[3px]">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const entry = dayMap.get(day);
                const isToday = day === today;
                return (
                  <div
                    key={day}
                    className={`flex-1 rounded-t ${
                      entry ? (entry.total >= 1000 ? "bg-orange-400/80" : "bg-accent/70") : "bg-zinc-800/40"
                    }`}
                    style={{ height: isToday ? "18px" : "10px" }}
                    title={entry ? `${entry.day} · ${entry.items.map((x) => x.name).join(", ")}` : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
