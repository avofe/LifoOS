"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiGet } from "@/lib/api";
import { addDaysKey, dayLabel, todayKey } from "@/lib/day";
import { SectionCard } from "./SectionCard";

interface SleepLog {
  id: string;
  day: string;
  bedAt: string;
  wakeAt: string;
  note: string | null;
  durationMin: number;
}

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

export function SleepSection() {
  const [date, setDate] = useState(todayKey);
  const [bedAt, setBedAt] = useState("");
  const [wakeAt, setWakeAt] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [avg7, setAvg7] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    apiGet<{ logs: SleepLog[]; avg7: number | null }>("/api/sleep?days=14").then(
      (d) => {
        setLogs(d?.logs ?? []);
        setAvg7(d?.avg7 ?? null);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const save = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(bedAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(wakeAt)) {
      return;
    }
    await apiFetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: date, bedAt, wakeAt, note: note || null }),
      silent: true,
    });
    setEditingId(null);
    setNote("");
    setBedAt("");
    setWakeAt("");
    fetchLogs();
  };

  const edit = (l: SleepLog) => {
    setDate(l.day);
    setBedAt(l.bedAt);
    setWakeAt(l.wakeAt);
    setNote(l.note ?? "");
    setEditingId(l.id);
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/sleep/${id}`, { method: "DELETE", silent: true });
    fetchLogs();
  };

  return (
    <SectionCard
      title="Сон"
      icon="◐"
      subtitle={
        loading
          ? "Загрузка..."
          : avg7 !== null
            ? `в среднем ${fmtDur(avg7)} за 7 ночей`
            : undefined
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Заснул
          <input
            type="time"
            value={bedAt}
            onChange={(e) => setBedAt(e.target.value)}
            className="rounded-md border border-zinc-800 bg-surface-2 px-2 py-1.5 font-mono text-sm text-zinc-200 outline-none transition focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Проснулся
          <input
            type="time"
            value={wakeAt}
            onChange={(e) => setWakeAt(e.target.value)}
            className="rounded-md border border-zinc-800 bg-surface-2 px-2 py-1.5 font-mono text-sm text-zinc-200 outline-none transition focus:border-accent/60"
          />
        </label>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setDate(addDaysKey(date, -1))}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-surface-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ◀
        </button>
        <button
          onClick={() => setDate(todayKey())}
          className="min-w-0 flex-1 truncate rounded-md border border-zinc-800 bg-surface-2 px-2 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider text-zinc-300 transition hover:text-accent-light"
        >
          {dayLabel(date)}
        </button>
        <button
          onClick={() => setDate(addDaysKey(date, 1))}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-surface-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ▶
        </button>
        <button
          onClick={save}
          disabled={!bedAt || !wakeAt}
          className="flex-shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {editingId ? "Сохранить" : "Записать"}
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Заметка (по желанию)..."
        className="mb-3 w-full rounded-md border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-accent/60"
      />

      {loading ? (
        <p className="py-4 text-center text-xs text-zinc-600">Загрузка...</p>
      ) : logs.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">
          Ночных записей пока нет
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {logs.slice(0, 10).map((l) => (
            <li
              key={l.id}
              className="group flex items-center gap-2 rounded-md border border-zinc-800/70 bg-surface-2/60 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">
                {dayLabel(l.day)}
                <span className="text-zinc-500">
                  {" "}
                  · {l.bedAt}–{l.wakeAt}
                </span>
              </span>
              <span className="font-mono text-[13px] font-bold text-accent-light">
                {fmtDur(l.durationMin)}
              </span>
              {l.note && (
                <span className="max-w-[30%] truncate text-[11px] text-zinc-500">
                  {l.note}
                </span>
              )}
              <button
                onClick={() => edit(l)}
                title="Изменить"
                className="px-1 text-xs text-zinc-600 opacity-0 transition hover:text-accent-light group-hover:opacity-100"
              >
                ✎
              </button>
              <button
                onClick={() => remove(l.id)}
                title="Удалить"
                className="px-1 text-xs text-zinc-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
