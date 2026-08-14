"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import type { TimelineEvent } from "@lifeos/types";

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(() => {
    apiGet<TimelineEvent[]>("/api/timeline").then((d) => {
      setTimeline(d ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchTimeline();
    const id = setInterval(fetchTimeline, 60000);
    return () => clearInterval(id);
  }, [fetchTimeline]);

  return (
    <div className="hidden h-full lg:flex">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`flex h-full flex-shrink-0 items-center justify-center border-l border-zinc-800 bg-black text-zinc-500 transition hover:bg-zinc-900 hover:text-accent-light ${
          collapsed ? "w-[28px] text-[10px]" : "w-[18px] text-[10px]"
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
        <Section title="Лента событий">
          <div className="relative flex flex-col">
            <div className="absolute left-[36px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-zinc-700/50 to-transparent" />
            {loading ? (
              <div className="flex flex-col gap-2 py-2">
                <Skeleton className="h-[26px] w-full" />
                <Skeleton className="h-[26px] w-full" />
                <Skeleton className="h-[26px] w-2/3" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                Событий пока нет
              </p>
            ) : (
              timeline.map((ev, i) => (
                <TimelineRow key={`${ev.type}-${ev.ts}-${i}`} time={ev.time} dot={ev.dot}>
                  <span>{ev.title}</span>
                  {ev.description && (
                    <div className="text-[10.5px] text-zinc-500">{ev.description}</div>
                  )}
                </TimelineRow>
              ))
            )}
          </div>
        </Section>
      </aside>
    </div>
  );
}

/* ── helpers ── */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/60 ${className ?? ""}`} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </div>
      {children}
    </div>
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
      <div className="mt-[5px] w-[44px] flex-shrink-0 text-right font-mono text-[10px] text-zinc-500">
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
