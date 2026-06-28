"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiFetch } from "@/lib/api";
import type { BriefData, BriefLatestResponse, BriefGenerateResponse } from "@lifeos/types";

export function AiBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [type, setType] = useState<"morning" | "evening" | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const fetchLatest = useCallback(() => {
    setLoading(true);
    setError(false);
    apiGet<BriefLatestResponse>("/api/ai/brief/latest")
      .then((data) => {
        if (data?.brief) {
          setBrief(data.brief);
          setType(data.type);
        } else {
          setBrief(null);
          setType(null);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const generate = useCallback(() => {
    setGenerating(true);
    setError(false);
    apiFetch<BriefGenerateResponse>("/api/ai/brief", { method: "POST" })
      .then((data) => {
        if (data?.brief) {
          setBrief(data.brief);
          setType(data.type);
        } else {
          setError(true);
        }
        setGenerating(false);
      })
      .catch(() => {
        setError(true);
        setGenerating(false);
      });
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-surface p-5 pb-[18px] pl-6">
      <div className="absolute left-0 top-5 bottom-5 w-[2px] rounded-full bg-gradient-to-b from-transparent via-accent to-transparent opacity-40 animate-vline" />

      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-accent-light">
            AI · Groq · llama-3.3-70b
            {type && (
              <span className="ml-2 text-zinc-500">
                · {type === "morning" ? "утро" : "вечер"}
              </span>
            )}
          </span>
          <span className="inline-block h-[11px] w-[5px] rounded-sm bg-accent animate-blink" />
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-zinc-500 transition hover:bg-surface-2 hover:text-accent-light disabled:opacity-40"
          title="Сгенерировать брифинг"
        >
          ⟳
        </button>
      </div>

      {(loading || generating) && !brief && (
        <p className="py-4 text-center text-xs text-zinc-600">
          {generating ? "Генерация брифинга..." : "Загрузка..."}
        </p>
      )}

      {error && (
        <p className="py-4 text-center text-xs text-red-400">
          Не удалось получить брифинг. Проверь API ключ Groq.
        </p>
      )}

      {!loading && !generating && !brief && !error && (
        <div className="py-4 text-center">
          <p className="mb-3 text-xs text-zinc-500">
            {type === "morning"
              ? "Утренний брифинг ещё не сгенерирован"
              : "Вечерний брифинг ещё не сгенерирован"}
          </p>
          <button
            onClick={generate}
            className="rounded-lg border border-accent/30 bg-accent-bg px-4 py-2 font-display text-xs font-medium text-accent-light transition hover:bg-accent/20"
          >
            Сгенерировать
          </button>
        </div>
      )}

      {brief && (
        <div className="mb-3.5">
          <p className="mb-3 font-display text-[12.5px] text-zinc-200 leading-relaxed">
            {brief.summary}
          </p>

          {brief.weather && (
            <p className="mb-3 flex items-center gap-2 text-[11.5px] text-zinc-400 leading-relaxed">
              <span>🌤</span> {brief.weather}
            </p>
          )}

          {brief.subscriptions.length > 0 && (
            <Section label="ПОДПИСКИ">
              {brief.subscriptions.map((s, i) => (
                <BriefItem
                  key={i}
                  icon="sub"
                  color={s.status === "critical" ? "red" : "yellow"}
                >
                  <b>{s.name}</b> — {s.amount}{" "}
                  <span className="text-zinc-400">через {s.daysLeft} дн.</span>
                </BriefItem>
              ))}
            </Section>
          )}

          <Section label={type === "morning" ? "YOUTUBE" : "YOUTUBE"}>
            <BriefItem icon="yt" color="green">
              {brief.youtube}
            </BriefItem>
          </Section>

          <Section label={type === "morning" ? "ЭКРАННОЕ ВРЕМЯ · ВЧЕРА" : "ЭКРАННОЕ ВРЕМЯ · СЕГОДНЯ"}>
            <BriefItem icon="sc" color="green">
              {brief.screentime}
            </BriefItem>
          </Section>

          {brief.quickActions.length > 0 && (
            <Section label={type === "morning" ? "ПЛАН НА ДЕНЬ" : "НА ЗАВТРА"}>
              <div className="flex flex-wrap gap-1.5">
                {brief.quickActions.map((a, i) => (
                  <QuickBtn key={i} highlight={i === 0}>
                    {a}
                  </QuickBtn>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      <div className="mt-3.5 rounded-lg border border-zinc-800 bg-surface-2 p-[9px_12px] text-[11.5px] leading-relaxed text-zinc-500">
        💡{" "}
        <span className="font-medium text-accent-light">Как это работает:</span>{" "}
        Groq (llama-3.3-70b) собирает данные о подписках, YouTube и экранном
        времени в структурированный брифинг. Утром — с погодой в Волоколамске и
        прогнозом. Вечером — с анализом дня. Брифинг сохраняется и показывается
        в течение дня.
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-2 mt-3.5 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-600 first:mt-0">
        {label}
      </div>
      <div className="flex flex-col gap-[7px]">{children}</div>
    </>
  );
}

function BriefItem({
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

  const iconMap: Record<string, string> = {
    sub: "⚡",
    sc: "◷",
    tw: "◉",
    yt: "▷",
  };

  return (
    <div className="flex items-start gap-[9px] text-[13px] leading-relaxed">
      <span
        className={`mt-[1px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-[11px] ${colorMap[color]}`}
      >
        {iconMap[icon] ?? "•"}
      </span>
      <span className="text-zinc-200 [&_b]:font-semibold [&_.hi]:font-medium [&_.hi]:text-accent-light">
        {children}
      </span>
    </div>
  );
}

function QuickBtn({ highlight, children }: { highlight?: boolean; children: React.ReactNode }) {
  return (
    <button
      className={`whitespace-nowrap rounded-[7px] border px-3 py-1.5 font-display text-xs font-medium transition
        ${highlight
          ? "border-indigo-500/40 bg-accent-bg text-accent-light"
          : "border-zinc-700/50 bg-surface-2 text-zinc-200 hover:border-accent hover:text-accent-light"
        }`}
    >
      {children}
    </button>
  );
}
