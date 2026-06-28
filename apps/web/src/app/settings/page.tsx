"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiGet } from "@/lib/api";

interface Settings {
  groqApiKey?: string;
  youtubeApiKey?: string;
}

interface Streamer {
  login: string;
  name: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [groqKey, setGroqKey] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [newLogin, setNewLogin] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [s, st] = await Promise.all([
      apiGet<Settings>("/api/settings"),
      apiGet<Streamer[]>("/api/twitch/streamers"),
    ]);
    if (s) {
      setSettings(s);
      setGroqKey(s.groqApiKey ?? "");
      setYoutubeKey(s.youtubeApiKey ?? "");
    }
    setStreamers(st ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const s = await apiFetch<Settings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groqApiKey: groqKey || undefined,
          youtubeApiKey: youtubeKey || undefined,
        }),
      });
      setSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStreamer = async () => {
    if (!newLogin.trim() || !newName.trim()) return;
    try {
      const st = await apiFetch<Streamer[]>("/api/twitch/streamers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: newLogin.trim(), name: newName.trim() }),
      });
      setStreamers(st);
      setNewLogin("");
      setNewName("");
    } catch {}
  };

  const handleRemoveStreamer = async (login: string) => {
    try {
      const st = await apiFetch<Streamer[]>(`/api/twitch/streamers/${login}`, {
        method: "DELETE",
      });
      setStreamers(st);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 bg-black p-6">
      <h1 className="text-lg font-semibold text-zinc-200">Настройки</h1>

      {/* API Keys */}
      <section className="rounded-xl border border-zinc-800 bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">API ключи</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Groq API Key</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">YouTube API Key</label>
            <input
              type="password"
              value={youtubeKey}
              onChange={(e) => setYoutubeKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            {saved && (
              <span className="text-xs text-emerald-400">Сохранено</span>
            )}
          </div>
        </div>
      </section>

      {/* Twitch Streamers */}
      <section className="rounded-xl border border-zinc-800 bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Стримеры Twitch</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {streamers.map((s) => (
            <div
              key={s.login}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300"
            >
              <span>{s.name}</span>
              <button
                onClick={() => handleRemoveStreamer(s.login)}
                className="text-zinc-600 transition hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-zinc-600">Login</label>
            <input
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              placeholder="recrent"
              className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-600">Имя</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="recrent"
              className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleAddStreamer}
            disabled={!newLogin.trim() || !newName.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </section>
    </div>
  );
}
