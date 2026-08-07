"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiGet, getAccessKey, setAccessKey } from "@/lib/api";
import type { Device, DeviceType } from "@lifeos/types";

interface Settings {
  groqApiKey?: string;
  youtubeApiKey?: string;
  weatherLocation?: string;
  screenLimitTotal?: number | null;
  screenLimitApps?: Record<string, number>;
}

interface LimitAppRow {
  name: string;
  usedSec: number;
}

interface Streamer {
  login: string;
  name: string;
}

interface RegisteredDevice {
  id: string;
  name: string;
  type: DeviceType;
  token: string;
}

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: "desktop", label: "Компьютер" },
  { value: "mobile", label: "Телефон" },
  { value: "tablet", label: "Планшет" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [groqKey, setGroqKey] = useState("");
  const [youtubeKey, setYoutubeKey] = useState("");
  const [weatherLocation, setWeatherLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [newLogin, setNewLogin] = useState("");
  const [newName, setNewName] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [devName, setDevName] = useState("");
  const [devType, setDevType] = useState<DeviceType>("desktop");
  const [registered, setRegistered] = useState<RegisteredDevice | null>(null);
  const [copied, setCopied] = useState(false);
  const [accessKey, setAccessKeyState] = useState("");
  const [accessSaved, setAccessSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limitTotal, setLimitTotal] = useState(0);
  const [appLimits, setAppLimits] = useState<Record<string, number>>({});
  const [limitApps, setLimitApps] = useState<LimitAppRow[]>([]);
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitSaved, setLimitSaved] = useState(false);

  const fetchAll = useCallback(async () => {
    const [s, st, d, l] = await Promise.all([
      apiGet<Settings>("/api/settings"),
      apiGet<Streamer[]>("/api/twitch/streamers"),
      apiGet<Device[]>("/api/devices"),
      apiGet<{ total: { usedSec: number }; apps: { name: string; usedSec: number }[] }>("/api/screentime/limits"),
    ]);
    if (s) {
      setSettings(s);
      setGroqKey(s.groqApiKey ?? "");
      setYoutubeKey(s.youtubeApiKey ?? "");
      setWeatherLocation(s.weatherLocation ?? "");
      setLimitTotal(s.screenLimitTotal ?? 0);
      setAppLimits(s.screenLimitApps ?? {});
    }
    setStreamers(st ?? []);
    setDevices(d ?? []);
    if (l) {
      setLimitApps(l.apps);
    }
    setAccessKeyState(getAccessKey());
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
          weatherLocation: weatherLocation || undefined,
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

  const handleRegisterDevice = async () => {
    if (!devName.trim()) return;
    try {
      const dev = await apiFetch<RegisteredDevice>("/api/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: devName.trim(), type: devType }),
      });
      setRegistered(dev);
      setDevName("");
      setDevType("desktop");
      const list = await apiGet<Device[]>("/api/devices");
      setDevices(list ?? []);
    } catch {}
  };

  const handleRemoveDevice = async (id: string) => {
    try {
      await apiFetch(`/api/devices/${id}`, { method: "DELETE", silent: true });
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch {}
  };

  const handleSaveAccessKey = async () => {
    setAccessKey(accessKey.trim());
    setAccessSaved(true);
    setTimeout(() => setAccessSaved(false), 2000);
    setTimeout(() => window.location.reload(), 400);
  };

  const handleSaveLimits = async () => {
    setLimitSaving(true);
    try {
      const apps: Record<string, number> = {};
      for (const [name, min] of Object.entries(appLimits)) {
        if (min > 0) apps[name] = min;
      }
      await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenLimitTotal: limitTotal > 0 ? limitTotal : null,
          screenLimitApps: apps,
        }),
      });
      setLimitSaved(true);
      setTimeout(() => setLimitSaved(false), 2000);
    } finally {
      setLimitSaving(false);
    }
  };

  function fmtUsed(totalSec: number): string {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h === 0) return `${m}м`;
    return `${h}ч ${m}м`;
  }

  const handleCopyToken = async () => {
    if (!registered) return;
    try {
      await navigator.clipboard.writeText(registered.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  function fmtLastSeen(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 5 * 60 * 1000) return "только что";
    if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)} мин назад`;
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function typeLabel(t: string): string {
    return DEVICE_TYPES.find((x) => x.value === t)?.label ?? t;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 bg-black p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-zinc-200">Настройки</h1>

      {/* Server access key */}
      <section className="rounded-xl border border-zinc-800 bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-300">
          Доступ к серверу
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          Мастер-ключ, который вводится при подключении к защищённому серверу.
          Хранится только на этом устройстве.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            value={accessKey}
            onChange={(e) => setAccessKeyState(e.target.value)}
            placeholder="Мастер-ключ"
            className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
          />
          <button
            onClick={handleSaveAccessKey}
            disabled={!accessKey.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Сохранить
          </button>
          {accessSaved && (
            <span className="text-xs text-emerald-400">Сохранено</span>
          )}
        </div>
      </section>

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

          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Локация для погоды
            </label>
            <input
              type="text"
              value={weatherLocation}
              onChange={(e) => setWeatherLocation(e.target.value)}
              placeholder="Volokolamsk"
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

      {/* Screen time limits */}
      <section className="rounded-xl border border-zinc-800 bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-300">Лимиты экрана</h2>
        <p className="mb-4 text-xs text-zinc-600">
          Дневной лимит на весь экран и отдельные приложения. Сегодня:
          {limitApps.length > 0 ? ` ${limitApps.map((a) => `${a.name} — ${fmtUsed(a.usedSec)}`).join(", ")}` : " нет данных"}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Общий лимит в день (минуты)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              value={limitTotal || ""}
              onChange={(e) => setLimitTotal(Number(e.target.value) || 0)}
              placeholder="480"
              className="w-full max-w-[160px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>

          {limitApps.length > 0 && (
            <div className="flex flex-col gap-2">
              {limitApps.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-zinc-200">{a.name}</span>
                    <span className="text-[11px] text-zinc-600">
                      сегодня {fmtUsed(a.usedSec)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-zinc-600">мин/день</label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={appLimits[a.name] ?? ""}
                      onChange={(e) =>
                        setAppLimits((prev) => ({
                          ...prev,
                          [a.name]: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveLimits}
              disabled={limitSaving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {limitSaving ? "Сохранение..." : "Сохранить лимиты"}
            </button>
            {limitSaved && (
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

      {/* Devices */}
      <section className="rounded-xl border border-zinc-800 bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Устройства</h2>

        {registered && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-1 text-xs font-medium text-emerald-400">
              Устройство «{registered.name}» зарегистрировано
            </div>
            <p className="mb-2 text-[11px] text-zinc-500">
              Токен показывается один раз. Вставь его в конфигурацию коллектора
              (LIFEOS_DEVICE_TOKEN) на этом устройстве.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                {registered.token}
              </code>
              <button
                onClick={handleCopyToken}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition hover:brightness-110"
              >
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] text-zinc-600">Название</label>
            <input
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="PC-2"
              className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-600">Тип</label>
            <select
              value={devType}
              onChange={(e) => setDevType(e.target.value as DeviceType)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-accent"
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRegisterDevice}
            disabled={!devName.trim()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Зарегистрировать
          </button>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Пока нет устройств. Зарегистрируй первое, чтобы собирать скринтайм.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-sm text-zinc-200">{d.name}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {typeLabel(d.type)}
                  </span>
                  {d.os && (
                    <span className="text-[11px] text-zinc-600">{d.os}</span>
                  )}
                  <span className="text-[11px] text-zinc-600">
                    {fmtLastSeen(d.lastSeenAt)}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveDevice(d.id)}
                  className="text-zinc-600 transition hover:text-red-400"
                  title="Удалить устройство"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
