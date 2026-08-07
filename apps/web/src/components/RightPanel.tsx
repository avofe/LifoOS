"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { useYouTube } from "@/hooks/useYouTube";
import { useWatched } from "@/hooks/useWatched";
import type { TwitchStreamer, TimelineEvent, Subscription } from "@lifeos/types";

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [streamers, setStreamers] = useState<TwitchStreamer[] | null>(null);
  const { videos: ytVideos } = useYouTube();

  const { watched, markWatched } = useWatched();

  useEffect(() => {
    apiGet<Subscription[]>("/api/subscriptions?upcomingDays=14")
      .then((data) => {
        if (data) {
          setSubs(data);
          const monthly = data.reduce(
            (acc, s) => acc + (s.billingCycle === "yearly" ? s.cost / 12 : s.cost),
            0
          );
          setTotal(Math.round(monthly));
        }
      });
  }, []);

  const fetchTwitch = useCallback(() => {
    apiGet<TwitchStreamer[]>("/api/twitch/streams")
      .then((d) => setStreamers(d ?? []));
  }, []);

  useEffect(() => {
    fetchTwitch();
    const id = setInterval(fetchTwitch, 60000);
    return () => clearInterval(id);
  }, [fetchTwitch]);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    apiGet<TimelineEvent[]>("/api/timeline")
      .then((d) => setTimeline(d ?? []));
  }, []);

  return (
    <div className="hidden h-full lg:flex">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`flex h-full flex-shrink-0 items-center justify-center border-l border-zinc-800 bg-black text-zinc-500 transition hover:bg-zinc-900 hover:text-accent-light ${
          collapsed
            ? "w-[28px] text-[10px]"
            : "w-[18px] text-[8px]"
        }`}
        title={collapsed ? "Показать панель" : "Скрыть панель"}
      >
        <span className={collapsed ? "opacity-60" : ""}>
          {collapsed ? "◀" : "▶"}
        </span>
      </button>

      <aside
        className={`flex h-full flex-col gap-[22px] overflow-y-auto transition-all duration-300 ${
          collapsed
            ? "w-0 overflow-hidden p-0 opacity-0"
            : "w-[280px] p-[24px_18px] opacity-100"
        }`}
      >
      {/* Subscriptions */}
      <Section title="Подписки · платежи">
        <div className="flex flex-col">
          {subs.length === 0 && (
            <p className="py-4 text-center text-xs text-zinc-600">
              Нет ближайших платежей
            </p>
          )}
          {subs.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-zinc-800 py-2 last:border-none"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[12.5px] text-zinc-200">{s.name}</div>
                <div className="text-[10.5px] text-zinc-500">
                  {formatDate(s.nextPaymentAt)}
                </div>
              </div>
              <div className="flex items-center gap-[7px]">
                {s.daysUntilPayment <= 2 && s.daysUntilPayment >= 0 && (
                  <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold text-orange-400 bg-orange-500/10">
                    {s.daysUntilPayment === 0
                      ? "сегодня"
                      : `${s.daysUntilPayment} дн.`}
                  </span>
                )}
                <span className="font-display text-[12.5px] font-medium text-zinc-500">
                  {formatCost(s.cost, s.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2.5 text-xs text-zinc-500">
          <span>Итого в месяц</span>
          <b className="font-display text-[13px] font-semibold text-zinc-200">
            {formatCost(total, "RUB")}
          </b>
        </div>
      </Section>

      {/* Twitch */}
      <Section title="Twitch · отслеживаемые">
        <div className="flex flex-col gap-1.5">
          {streamers === null && (
            <p className="py-2 text-center text-xs text-zinc-600">
              Загрузка...
            </p>
          )}
          {streamers !== null && streamers.length === 0 && (
            <p className="py-2 text-center text-xs text-zinc-600">
              Нет данных
            </p>
          )}
          {streamers?.map((s) => (
            <StreamItem
              key={s.id}
              name={s.displayName}
              login={s.login}
              game={s.online ? `${s.game ?? "??"} · ${formatViewers(s.viewers)} зрителей` : "Офлайн"}
              live={s.uptime ?? undefined}
              offline={!s.online}
            />
          ))}
        </div>
      </Section>

      {/* YouTube */}
      <Section title="YouTube · новые видео">
        <div className="flex flex-col">
          {ytVideos.length === 0 && (
            <p className="py-2 text-center text-xs text-zinc-600">
              Загрузка...
            </p>
          )}
          {ytVideos.slice(0, 5).map((v) => {
            const isWatched = watched.has(v.id);
            return (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                onClick={() => markWatched(v.id)}
                className={`flex items-start gap-2 border-b border-zinc-800 py-[7px] last:border-none transition ${
                  isWatched ? "opacity-40" : "hover:opacity-80"
                }`}
              >
                <div className="h-[34px] w-[54px] flex-shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                  {v.thumb ? (
                    <img
                      src={v.thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-[10px] ${
                      isWatched ? "text-zinc-600" : "text-zinc-500"
                    }`}>
                      {isWatched ? "✓" : "▷"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11.5px] leading-tight line-clamp-2 ${
                    isWatched ? "text-zinc-500" : "text-zinc-200"
                  }`}>
                    {v.title}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-zinc-500">
                    {v.channel} · {formatTimeAgo(v.publishedAt)}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </Section>

      {/* Timeline */}
      <Section title="Лента событий">
        <div className="relative flex flex-col">
          <div className="absolute left-[36px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-zinc-700/50 to-transparent" />
          {timeline.length === 0 && (
            <p className="py-4 text-center text-xs text-zinc-600">
              Нет событий
            </p>
          )}
          {timeline.map((ev, i) => (
            <TimelineRow key={i} time={ev.time} dot={ev.dot}>
              <span>{ev.title}</span>
              {ev.description && (
                <div className="text-[10.5px] text-zinc-500">{ev.description}</div>
              )}
            </TimelineRow>
          ))}
        </div>
      </Section>
    </aside>
    </div>
  );
}

/* ── helpers ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function StreamItem({
  name,
  game,
  live,
  offline,
  login,
}: {
  name: string;
  game: string;
  live?: string;
  offline?: boolean;
  login?: string;
}) {
  return (
    <a
      href={login ? `https://twitch.tv/${login}` : "#"}
      className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition ${
        offline
          ? "border-zinc-800 bg-surface-2 opacity-50 hover:border-zinc-700/50"
          : "border-indigo-500/30 bg-indigo-500/[0.04] hover:border-indigo-500/50"
      }`}
    >
      <div
        className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          offline
            ? "bg-zinc-700/50 text-zinc-500"
            : "bg-indigo-500/20 text-indigo-300"
        }`}
      >
        {name[0]}
        {!offline && (
          <span className="absolute inset-[-2px] animate-ring rounded-full border border-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-medium text-zinc-200">
            {name}
          </span>
          {live && (
            <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-zinc-500">
          {live ? game : "Офлайн"}
        </div>
      </div>
      {live && (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[10px] font-medium text-emerald-400">
            {live}
          </span>
          {game && (
            <span className="font-mono text-[9px] text-zinc-500">
              {game.split("·").pop()?.trim()}
            </span>
          )}
        </div>
      )}
    </a>
  );
}

function TimelineRow({
  time,
  dot,
  children,
}: {
  time: string;
  dot: "green" | "accent" | "orange" | "default";
  children: React.ReactNode;
}) {
  const dotStyles: Record<string, string> = {
    green: "bg-emerald-400 border-emerald-400",
    accent: "bg-accent border-accent",
    orange: "bg-orange-400 border-orange-400",
    default: "bg-zinc-600 border-zinc-700/50",
  };

  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="mt-[5px] w-[30px] flex-shrink-0 text-right font-mono text-[9px] text-zinc-500">
        {time}
      </div>
      <div className="mt-[7px] flex w-3.5 flex-shrink-0 items-center justify-center">
        <div className={`z-10 h-[5px] w-[5px] rounded-full border ${dotStyles[dot]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs leading-relaxed text-zinc-200 [&_b]:font-semibold">
          {children}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "только что";
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}к`;
  return String(n);
}

function formatCost(cost: number, currency: string) {
  if (currency === "RUB") return `${cost.toLocaleString("ru-RU")} ₽`;
  return `${cost.toFixed(2)}${currency === "USD" ? "$" : "€"}`;
}
