"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { DaySummary } from "@lifeos/types";

function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0 && m === 0) return totalSec > 0 ? "<1м" : "0м";
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function fmtAgo(publishedAt: string): string {
  const diff = Date.now() - new Date(publishedAt).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(0, Math.floor(diff / 60000))}м назад`;
  if (hours < 24) return `${hours}ч назад`;
  return `${Math.floor(hours / 24)}д назад`;
}

export function DaySummary() {
  const [data, setData] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    setError(false);
    apiGet<DaySummary>("/api/summary")
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const hasContent =
    data &&
    (data.yesterday ||
      data.forecast ||
      data.streak ||
      data.plan.length > 0 ||
      data.payments.length > 0 ||
      data.videos.length > 0 ||
      data.streams.length > 0);

  return (
    <div className="card relative overflow-hidden p-5 pb-[18px] pl-6">
      <div className="absolute left-0 top-5 bottom-5 w-[2px] rounded-full bg-gradient-to-b from-transparent via-accent to-transparent opacity-40 animate-vline" />

      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent-light">
            Сводка дня
          </span>
          <span className="inline-block h-[11px] w-[5px] rounded-sm bg-accent animate-blink" />
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="btn-icon disabled:cursor-not-allowed disabled:opacity-40"
          title="Обновить сводку"
          aria-label="Обновить сводку"
        >
          ⟳
        </button>
      </div>

      {loading && !data && (
        <p className="py-4 text-center text-xs text-zinc-500">Загрузка...</p>
      )}

      {error && (
        <p className="py-4 text-center text-xs text-red-400">
          Не удалось получить сводку.
        </p>
      )}

      {!loading && !error && !hasContent && (
        <p className="py-4 text-center text-xs text-zinc-500">
          Данных пока нет. Данные появятся, когда устройства начнут присылать
          активность.
        </p>
      )}

      {data && hasContent && (
        <div className="mb-3.5">
          {/* plan for the day */}
          {data.plan.length > 0 && (
            <Section label="ПЛАН НА ДЕНЬ">
              {data.plan.map((t) => (
                <Row
                  key={t.id}
                  icon={t.done ? "✓" : "☐"}
                  color={t.done ? "green" : "yellow"}
                >
                  <span className={t.done ? "text-zinc-500 line-through" : ""}>
                    {t.text}
                  </span>
                </Row>
              ))}
              <Row icon="→" color="green">
                <a
                  href="/day"
                  className="text-zinc-400 underline-offset-2 transition hover:text-accent-light hover:underline"
                >
                  Открыть день →
                </a>
              </Row>
            </Section>
          )}

          {/* screen time */}
          <Section label="ЭКРАННОЕ ВРЕМЯ">
            {data.yesterday && (
              <Row icon="◷" color="green">
                <b>Вчера:</b> {fmtTime(data.yesterday.totalSec)}
                {data.yesterday.over
                  ? " — превышение лимита"
                  : data.yesterday.limitMin !== null
                    ? " — в рамках лимита"
                    : ""}
                {data.yesterday.apps.length > 0 && (
                  <span className="text-zinc-400">
                    {" "}
                    · топ:{" "}
                    {data.yesterday.apps
                      .slice(0, 3)
                      .map((a) => a.name)
                      .join(", ")}
                  </span>
                )}
              </Row>
            )}

            {data.forecast && (
              <Row icon="◷" color={data.todayOver ? "red" : "green"}>
                <b>Сегодня:</b> {fmtTime(data.todayTotalSec)}
                {data.todayOver
                  ? " — превышен лимит"
                  : data.todayRemainingSec !== null
                    ? ` · осталось ${fmtTime(data.todayRemainingSec)}`
                    : ""}
                {" · "}если так продолжишь — {data.forecast.projected}
              </Row>
            )}

            {data.streak && data.streak.streak > 0 && (
              <Row icon="🔥" color="green">
                <b>{data.streak.streak}</b> день подряд
                {data.streak.record > 0 && (
                  <span className="text-zinc-400">
                    {" "}
                    · рекорд {data.streak.record}
                  </span>
                )}
              </Row>
            )}
          </Section>

          {/* content */}
          {(data.videos.length > 0 || data.streams.length > 0) && (
            <Section label="КОНТЕНТ">
              {data.videos.map((v) => (
                <Row key={v.id} icon="▷" color="green">
                  <b>{v.channel}</b> — {v.title}{" "}
                  <span className="text-zinc-500">{fmtAgo(v.publishedAt)}</span>
                </Row>
              ))}
              {data.streams.map((st, i) => (
                <Row key={`${st.displayName}-${i}`} icon="◉" color="orange">
                  <b>{st.displayName}</b> — онлайн{st.game ? ` · ${st.game}` : ""}
                  {st.viewers > 0 ? ` · ${st.viewers} зр.` : ""}
                  {st.uptime ? ` · ${st.uptime}` : ""}
                </Row>
              ))}
            </Section>
          )}

          {/* payments */}
          {data.payments.length > 0 && (
            <Section label="ПЛАТЕЖИ">
              {data.payments.map((p, i) => (
                <Row key={i} icon="⚡" color={p.daysLeft <= 1 ? "red" : "yellow"}>
                  <b>{p.name}</b> — {p.amount}{" "}
                  <span className="text-zinc-400">
                    {p.daysLeft === 0
                      ? "сегодня"
                      : `через ${p.daysLeft} дн.`}
                  </span>
                </Row>
              ))}
            </Section>
          )}
        </div>
      )}

      <div className="mt-3.5 rounded-lg border border-zinc-800 bg-surface-2 p-[9px_12px] text-[11.5px] leading-relaxed text-zinc-400">
        💡 Сводка собирается из твоих данных без AI — всегда актуально и без
        ошибок.
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="label mb-2 mt-3.5 first:mt-0">
        {label}
      </div>
      <div className="flex flex-col gap-[7px]">{children}</div>
    </>
  );
}

function Row({
  icon,
  color,
  children,
}: {
  icon: string;
  color: "green" | "red" | "orange" | "yellow";
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-emerald-500/10 text-emerald-400",
    red: "bg-red-500/10 text-red-400",
    orange: "bg-orange-500/10 text-orange-400",
    yellow: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="flex items-start gap-[9px] text-[13px] leading-relaxed">
      <span
        className={`mt-[1px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-[11px] ${colorMap[color]}`}
      >
        {icon}
      </span>
      <span className="text-zinc-200 [&_b]:font-semibold">{children}</span>
    </div>
  );
}
