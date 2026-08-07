"use client";

import { useEffect, useState } from "react";
import { setAccessKey, getAccessKey, setAuthRequiredHandler } from "@/lib/api";

export function AccessKeyModal() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    setAuthRequiredHandler(() => () => {
      if (open) return;
      setKey(getAccessKey());
      setOpen(true);
    });
    return () => setAuthRequiredHandler(null);
  }, [open]);

  function handleSave() {
    setAccessKey(key.trim());
    window.location.reload();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-2 text-base font-semibold text-zinc-100">
          Требуется ключ доступа
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Этот сервер LifeOS защищён мастер-ключом. Введи ключ доступа, чтобы
          продолжить.
        </p>
        <input
          autoFocus
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Ключ доступа"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Позже
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}
