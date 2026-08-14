"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiGet } from "@/lib/api";
import { dayLabel, lastDays, todayKey } from "@/lib/day";
import { SectionCard } from "./SectionCard";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  streak: number;
  record: number;
  days: string[];
}

const EMOJIS = ["✅", "💧", "🏃", "📖", "🧘", "💪", "😴", "🙏", "⚡", "🍎"];

export function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [showAdd, setShowAdd] = useState(false);

  const fetchHabits = useCallback(() => {
    apiGet<{ habits: Habit[] }>("/api/habits").then((d) => {
      setHabits(d?.habits ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = async () => {
    const n = name.trim();
    if (!n) return;
    await apiFetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, emoji }),
      silent: true,
    });
    setName("");
    setEmoji("✅");
    setShowAdd(false);
    fetchHabits();
  };

  const toggle = async (habitId: string, day: string) => {
    await apiFetch(`/api/habits/${habitId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day }),
      silent: true,
    });
    fetchHabits();
  };

  const remove = async (habitId: string) => {
    await apiFetch(`/api/habits/${habitId}`, { method: "DELETE", silent: true });
    fetchHabits();
  };

  const days = lastDays(7);
  const today = todayKey();

  return (
    <SectionCard
      title="Привычки"
      icon="✦"
      subtitle={
        loading
          ? "Загрузка..."
          : habits.length > 0
            ? `${habits.length} привычек`
            : undefined
      }
    >
      {loading ? (
        <p className="py-4 text-center text-xs text-zinc-600">Загрузка...</p>
      ) : habits.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">
          Пока нет привычек. Добавь первую, чтобы следить за повторениями.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[minmax(140px,1fr)_repeat(7,36px)] gap-1 pb-2">
              <div className="pl-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                Привычка
              </div>
              {days.map((d) => (
                <div
                  key={d}
                  className={`text-center font-mono text-[10px] uppercase ${
                    d === today ? "text-accent-light" : "text-zinc-600"
                  }`}
                  title={dayLabel(d)}
                >
                  {dayLabel(d, true)}
                </div>
              ))}
              <div className="pl-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                Стрик
              </div>
              {days.map((d) => (
                <div key={d} className="h-[2px] w-full rounded bg-zinc-800/50" />
              ))}
            </div>

            <ul className="flex flex-col gap-1.5">
              {habits.map((h) => (
                <li
                  key={h.id}
                  className="group grid grid-cols-[minmax(140px,1fr)_repeat(7,36px)] items-center gap-1 rounded-md border border-zinc-800/70 bg-surface-2/60 px-2 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate text-[13px] text-zinc-200">
                    <span>{h.emoji}</span>
                    <span className="truncate">{h.name}</span>
                  </span>
                  {days.map((d) => {
                    const done = h.days.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggle(h.id, d)}
                        title={`${d}: ${done ? "отметить как невыполнено" : "отметить выполненным"}`}
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded border text-[11px] transition ${
                          done
                            ? "border-emerald-500 bg-emerald-500/90 text-white"
                            : "border-zinc-700 bg-transparent text-transparent hover:border-emerald-500"
                        } ${d === today ? "ring-1 ring-accent/40" : ""}`}
                      >
                        ✓
                      </button>
                    );
                  })}
                  <span className="flex items-center justify-end gap-2 pl-2">
                    {h.streak > 0 && (
                      <span className="font-mono text-[11px] font-bold text-accent-light">
                        {h.streak}д
                      </span>
                    )}
                    {h.record > 1 && (
                      <span className="font-mono text-[10px] text-zinc-600">
                        р{h.record}
                      </span>
                    )}
                    <button
                      onClick={() => remove(h.id)}
                      title="Удалить привычку"
                      className="px-1 text-xs text-zinc-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showAdd ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-surface-2 p-2.5">
          <div className="flex gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-7 w-7 items-center justify-center rounded text-sm transition ${
                  emoji === e
                    ? "bg-accent/20 ring-1 ring-accent/60"
                    : "hover:bg-zinc-800"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="Название привычки..."
            className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-black/40 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-accent/60"
          />
          <button
            onClick={addHabit}
            disabled={!name.trim()}
            className="flex-shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Добавить
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-3 w-full rounded-md border border-dashed border-zinc-700 py-2 text-xs text-zinc-500 transition hover:border-accent/50 hover:text-accent-light"
        >
          + добавить привычку
        </button>
      )}
    </SectionCard>
  );
}
