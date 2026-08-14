"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiGet } from "@/lib/api";
import { addDaysKey, dayLabel, isToday, todayKey } from "@/lib/day";
import { SectionCard } from "./SectionCard";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export function PlanSection() {
  const [date, setDate] = useState(todayKey);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    apiGet<{ tasks: Task[] }>(`/api/tasks?date=${date}`).then((d) => {
      setTasks(d?.tasks ?? []);
      setLoading(false);
    });
  }, [date]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    const t = text.trim();
    if (!t) return;
    await apiFetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: date, text: t }),
      silent: true,
    });
    setText("");
    fetchTasks();
    inputRef.current?.focus();
  };

  const toggle = async (id: string, done: boolean) => {
    await apiFetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
      silent: true,
    });
    fetchTasks();
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE", silent: true });
    fetchTasks();
  };

  const carry = async (id: string) => {
    await apiFetch(`/api/tasks/${id}/carry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toDate: addDaysKey(date, 1) }),
      silent: true,
    });
    fetchTasks();
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <SectionCard
      title="Задачи на день"
      icon="☐"
      subtitle={
        loading
          ? "Загрузка..."
          : tasks.length > 0
            ? `${doneCount}/${tasks.length} выполнено`
            : undefined
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setDate(addDaysKey(date, -1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-surface-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ◀
        </button>
        <button
          onClick={() => setDate(todayKey())}
          className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
            isToday(date)
              ? "border-zinc-800 bg-surface-2 text-accent-light"
              : "border-zinc-800 bg-surface-2 text-zinc-300 hover:text-accent-light"
          }`}
        >
          {isToday(date) ? "Сегодня" : dayLabel(date)}
        </button>
        <button
          onClick={() => setDate(addDaysKey(date, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-surface-2 text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ▶
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Добавить задачу..."
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-accent/60"
        />
        <button
          onClick={addTask}
          disabled={!text.trim()}
          className="flex-shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {loading ? (
        <p className="py-4 text-center text-xs text-zinc-600">Загрузка...</p>
      ) : tasks.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-600">
          На этот день задач нет
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-2 rounded-md border border-zinc-800/70 bg-surface-2/60 px-2.5 py-2"
            >
              <button
                onClick={() => toggle(t.id, t.done)}
                className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border text-[11px] transition ${
                  t.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-600 bg-transparent text-transparent hover:border-emerald-500"
                }`}
              >
                ✓
              </button>
              <span
                className={`min-w-0 flex-1 text-sm ${
                  t.done ? "text-zinc-600 line-through" : "text-zinc-200"
                }`}
              >
                {t.text}
              </span>
              {!t.done && (
                <button
                  onClick={() => carry(t.id)}
                  title="Перенести на завтра"
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 opacity-0 transition hover:text-accent-light group-hover:opacity-100"
                >
                  →завтра
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                title="Удалить"
                className="flex-shrink-0 px-1 text-xs text-zinc-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
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
