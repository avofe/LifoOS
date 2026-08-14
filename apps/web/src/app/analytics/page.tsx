"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import type {
  AnalyticsData,
  DailyEntry,
  Device,
  DeviceDayStat,
  HourlyData,
  ScreenLimitsData,
} from "@lifeos/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";

const DEVICE_TYPE_LABELS: Record<string, string> = {
  desktop: "ПК",
  mobile: "Телефон",
  tablet: "Планшет",
};

/* ── formatting ─────────────────────────────────────────────── */

function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0 && m === 0) return totalSec > 0 ? "<1м" : "0м";
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

function hourTicks(maxSec: number): number[] {
  const maxH = Math.max(1, Math.ceil(maxSec / 3600));
  const step = Math.max(1, Math.ceil(maxH / 5));
  const ticks: number[] = [];
  for (let h = 0; h <= maxH; h += step) ticks.push(h * 3600);
  return ticks;
}

/* ── chart data helpers ─────────────────────────────────────── */

interface ChartDay {
  date: string;
  label: string;
  total: number;
  devices: Record<string, number>;
  apps: { name: string; color: string; seconds: number }[];
}

interface DeviceMeta {
  id: string;
  name: string;
  type: string;
  color: string;
}

/* ── page ───────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [hourly, setHourly] = useState<HourlyData | null>(null);
  const [limits, setLimits] = useState<ScreenLimitsData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [days, setDays] = useState(14);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{
    date: string;
    label: string;
    hour: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    apiGet<Device[]>("/api/devices").then((d) => setDevices(d ?? []));
    apiGet<ScreenLimitsData>("/api/screentime/limits").then((l) => setLimits(l));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setHourly(null);
    const q = new URLSearchParams();
    if (deviceId) q.set("device", deviceId);
    q.set("days", String(days));
    Promise.all([
      apiGet<AnalyticsData>(`/api/screentime/analytics?${q}`),
      apiGet<HourlyData>(`/api/screentime/hourly?${q}`),
    ]).then(([a, h]) => {
      if (cancelled) return;
      setData(a);
      setHourly(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, days]);

  const chartData = useMemo<ChartDay[]>(() => {
    return (data?.daily ?? []).map((d) => {
      const rec: ChartDay = {
        date: d.date,
        label: d.label,
        total: d.total,
        devices: {},
        apps: d.apps,
      };
      for (const dv of d.devices) rec.devices[dv.id] = dv.seconds;
      return rec;
    });
  }, [data]);

  const deviceMeta = useMemo<DeviceMeta[]>(() => {
    const map = new Map<string, DeviceMeta>();
    for (const d of data?.daily ?? []) {
      for (const dv of d.devices) {
        if (!map.has(dv.id)) {
          map.set(dv.id, { id: dv.id, name: dv.name, type: dv.type, color: dv.color });
        }
      }
    }
    return Array.from(map.values());
  }, [data]);

  const maxTotal = useMemo(
    () => Math.max(...chartData.map((d) => d.total), 3600),
    [chartData]
  );

  useEffect(() => {
    if (
      data &&
      data.daily.length > 0 &&
      (selectedDate === null || !data.daily.some((d) => d.date === selectedDate))
    ) {
      setSelectedDate(data.daily[data.daily.length - 1].date);
    }
  }, [data, selectedDate]);

  const selectedEntry = useMemo(
    () => data?.daily.find((d) => d.date === selectedDate) ?? null,
    [data, selectedDate]
  );

  const appSeries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; perDay: { date: string; label: string; seconds: number }[] }
    >();
    for (const d of data?.daily ?? []) {
      for (const a of d.apps) {
        let s = map.get(a.name);
        if (!s) {
          s = { name: a.name, color: a.color, perDay: [] };
          map.set(a.name, s);
        }
        s.perDay.push({ date: d.date, label: d.label, seconds: a.seconds });
      }
    }
    return map;
  }, [data]);

  const wc = data?.weekComparison;
  const limitMin = limits?.total.limitMin ?? null;
  const limitUsedSec = limits?.total.usedSec ?? 0;

  const handleBarClick = (date: string) => {
    if (data && data.daily.some((d) => d.date === date)) setSelectedDate(date);
  };

  const handleAppClick = (name: string) => {
    setActiveApp((cur) => (cur === name ? null : name));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 bg-black p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Экранное время" subtitle="Аналитика" />

        <div className="flex flex-wrap items-center gap-2">
          {/* period */}
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-surface-2 p-0.5">
            {[7, 14, 30].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`rounded-md px-3 py-1.5 font-mono text-[11px] transition ${
                  days === n
                    ? "bg-accent font-bold text-white"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {n}д
              </button>
            ))}
          </div>

          {/* devices */}
          <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-surface-2 p-0.5 sm:max-w-none">
            <button
              onClick={() => setDeviceId("")}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] transition ${
                deviceId === ""
                  ? "bg-accent font-medium text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Все
            </button>
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => setDeviceId(d.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] transition ${
                  deviceId === d.id
                    ? "bg-accent font-medium text-white"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[110px] animate-pulse rounded-xl border border-zinc-800 bg-surface" />
          ))}
        </div>
      )}

      {!loading && !data && (
        <div className="rounded-xl border border-zinc-800 bg-surface p-10 text-center text-sm text-zinc-500">
          Нет данных. Убедись, что коллектор ActivityWatch запущен на устройствах.
        </div>
      )}

      {data && (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Сегодня" value={fmtTime(data.todayTotal)}>
              <span className="text-[11px] text-zinc-500">
                {deviceMeta.length > 1 && deviceId === ""
                  ? `${deviceMeta.length} устройства`
                  : "по всем устройствам"}
              </span>
            </StatCard>

            <LimitCard
              limitMin={limitMin}
              usedSec={limitUsedSec}
              todayTotal={data.todayTotal}
            />

            <StatCard label="Последние 7 дней" value={fmtTime(wc?.current ?? 0)}>
              <span className="text-[11px] text-zinc-500">
                ~{Math.round(((wc?.current ?? 0) / 7 / 3600) * 10) / 10}ч/день
              </span>
            </StatCard>

            <StatCard
              label="vs прошлая неделя"
              value={
                wc?.diffPercent == null
                  ? "—"
                  : `${wc.diffPercent > 0 ? "+" : ""}${wc.diffPercent}%`
              }
              tone={wc?.diffPercent == null ? undefined : wc.diffPercent <= 0 ? "good" : "bad"}
            >
              <span className="text-[11px] text-zinc-500">
                {wc?.diffPercent == null
                  ? "недостаточно данных"
                  : `${wc.diffPercent <= 0 ? "↓ меньше" : "↑ больше"} · было ${fmtTime(wc.previous)}`}
              </span>
            </StatCard>
          </div>

          {/* daily stacked chart */}
          <Card
            title={`Активность по дням · ${days} дней`}
            hint="клик по столбику — приложения дня"
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <XAxis
                  dataKey={(d: ChartDay) => fmtDate(d.date)}
                  tick={{ fill: "#52526A", fontSize: 10, fontFamily: "Space Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  domain={[0, Math.ceil(maxTotal / 3600) * 3600]}
                  ticks={hourTicks(maxTotal)}
                  tick={{ fill: "#52526A", fontSize: 10, fontFamily: "Space Mono" }}
                  tickFormatter={(v: number) => `${Math.round(v / 3600)}ч`}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<DailyTooltip deviceMeta={deviceMeta} />} cursor={{ fill: "rgba(123,111,240,0.06)" }} />
                {limitMin !== null && (
                  <ReferenceLine
                    y={limitMin * 60}
                    stroke="#F07070"
                    strokeDasharray="4 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `${Math.round(limitMin / 60)}ч`,
                      position: "right",
                      fill: "#F07070",
                      fontSize: 10,
                      fontFamily: "Space Mono",
                    }}
                  />
                )}
                {deviceMeta.length > 0 ? (
                  deviceMeta.map((dm) => (
                    <Bar
                      key={dm.id}
                      dataKey={(d: ChartDay) => d.devices[dm.id] ?? 0}
                      name={dm.name}
                      stackId="dev"
                      fill={dm.color}
                      opacity={0.85}
                      onClick={(entry: any) => handleBarClick(entry?.payload?.date)}
                      className="cursor-pointer"
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="total"
                    name="Экран"
                    fill="#7B6FF0"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                    opacity={0.85}
                    onClick={(entry: any) => handleBarClick(entry?.payload?.date)}
                    className="cursor-pointer"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>

            {deviceMeta.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {deviceMeta.map((dm) => (
                  <span key={dm.id} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: dm.color }} />
                    {dm.name}
                    <span className="font-mono text-[10px] text-zinc-600">
                      {DEVICE_TYPE_LABELS[dm.type] ?? dm.type}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* day detail */}
          {selectedEntry && (
            <DayDetail entry={selectedEntry} activeApp={activeApp} onAppClick={handleAppClick} />
          )}

          {/* hourly heatmap */}
          <Card title="Активность по часам" hint={hoverCell ? undefined : "наведи на клетку"}>
            {hourly && hourly.days.length > 0 ? (
              <>
                <HourHeatmap
                  hourly={hourly}
                  onHover={setHoverCell}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-h-[18px] text-[11.5px] text-zinc-400">
                    {hoverCell ? (
                      <>
                        <b className="text-zinc-200">
                          {hoverCell.label} {fmtDate(hoverCell.date)}
                        </b>
                        {" · "}
                        {String(hoverCell.hour).padStart(2, "0")}:00–{String(hoverCell.hour).padStart(2, "0")}:59
                        {" · "}
                        <span className="font-mono text-zinc-200">{fmtTime(hoverCell.total)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                    меньше
                    <span className="h-2.5 w-10 rounded-sm" style={{ background: "linear-gradient(to right, rgba(123,111,240,0.08), rgba(123,111,240,0.95))" }} />
                    больше
                  </div>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-zinc-600">Нет данных по часам</p>
            )}
          </Card>

          {/* top apps */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="hidden rounded-xl border border-zinc-800 bg-surface p-5 sm:block lg:col-span-2">
              <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Топ приложений
              </div>
              {data.topApps.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={data.topApps.slice(0, 6)}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={84}
                      paddingAngle={2}
                      onClick={(entry: any) => handleAppClick(entry?.name)}
                    >
                      {data.topApps.slice(0, 6).map((app, i) => (
                        <Cell
                          key={i}
                          fill={app.color}
                          opacity={activeApp === null || activeApp === app.name ? 0.9 : 0.25}
                          className="cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <p className="mt-2 text-center text-[10px] text-zinc-600">
                клик по сектору — график приложения
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-surface p-5 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Приложения · {days} дней
                </span>
                {activeApp && (
                  <button
                    onClick={() => setActiveApp(null)}
                    className="text-[10px] text-zinc-500 transition hover:text-zinc-200"
                  >
                    ✕ сбросить фильтр
                  </button>
                )}
              </div>
              {data.topApps.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">Нет данных по приложениям</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {data.topApps.slice(0, 8).map((app, i) => {
                    const maxApp = data.topApps[0].total || 1;
                    const pct = ((app.total / maxApp) * 100).toFixed(1);
                    const active = activeApp === app.name;
                    return (
                      <button
                        key={app.name}
                        onClick={() => handleAppClick(app.name)}
                        className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                          active
                            ? "bg-accent-bg"
                            : activeApp !== null
                              ? "opacity-40 hover:opacity-80"
                              : "hover:bg-surface-2"
                        }`}
                      >
                        <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] text-zinc-500">
                          {i + 1}
                        </span>
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ background: app.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-zinc-200">{app.name}</span>
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-zinc-800">
                            <span
                              className="block h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: app.color,
                                opacity: 0.75,
                              }}
                            />
                          </span>
                        </span>
                        <span className="flex flex-shrink-0 flex-col items-end gap-0.5">
                          <span className="font-mono text-[12px] text-zinc-300">{fmtTime(app.total)}</span>
                          <span className="font-mono text-[10px] text-zinc-600">
                            {data.daily.reduce((s, d) => s + d.total, 0) > 0
                              ? `${(((app.total / data.daily.reduce((s, d) => s + d.total, 0)) * 100)).toFixed(0)}%`
                              : "—"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeApp && appSeries.has(activeApp) && (
                <AppSeriesChart
                  app={appSeries.get(activeApp)!}
                  onAppClick={handleAppClick}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── sub-components ─────────────────────────────────────────── */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {title}
        </span>
        {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-surface p-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <span
        className={`font-display text-xl font-bold leading-none sm:text-2xl ${
          tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-zinc-100"
        }`}
      >
        {value}
      </span>
      {children}
    </div>
  );
}

function LimitCard({
  limitMin,
  usedSec,
  todayTotal,
}: {
  limitMin: number | null;
  usedSec: number;
  todayTotal: number;
}) {
  const limitSec = limitMin !== null ? limitMin * 60 : null;
  const pct = limitSec ? Math.min(100, Math.round((todayTotal / limitSec) * 100)) : null;
  const over = limitSec !== null && todayTotal > limitSec;
  const remaining = limitSec !== null ? limitSec - todayTotal : 0;

  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-surface p-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Лимит дня
      </span>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="#2D2D44" strokeWidth="6" />
            {limitSec !== null && (
              <circle
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke={over ? "#F07070" : "#7B6FF0"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct! / 100) * c} ${c}`}
              />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-bold text-zinc-100">
            {pct === null ? "—" : `${pct}%`}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] text-zinc-200">
            {limitSec === null
              ? "лимит не задан"
              : over
                ? `превышен на ${fmtTime(-remaining)}`
                : `осталось ${fmtTime(remaining)}`}
          </div>
          <div className="mt-0.5 text-[10.5px] text-zinc-500">
            {limitSec === null ? "установи в настройках" : `из ${fmtTime(limitSec)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDetail({
  entry,
  activeApp,
  onAppClick,
}: {
  entry: DailyEntry;
  activeApp: string | null;
  onAppClick: (name: string) => void;
}) {
  const total = entry.total;
  const maxApp = entry.apps[0]?.seconds || 1;

  return (
    <div className="rounded-xl border border-accent/20 bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-light">
          {entry.label} · {fmtDate(entry.date)}
        </span>
        <span className="font-display text-sm font-bold text-zinc-100">{fmtTime(total)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">Приложения</div>
          {entry.apps.length === 0 ? (
            <p className="text-xs text-zinc-600">Нет данных по приложениям</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entry.apps.slice(0, 8).map((a) => (
                <button
                  key={a.name}
                  onClick={() => onAppClick(a.name)}
                  className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition ${
                    activeApp === a.name ? "bg-accent-bg" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-200">{a.name}</span>
                  <span className="font-mono text-[10.5px] text-zinc-400">{fmtTime(a.seconds)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">Устройства</div>
          {entry.devices.length === 0 ? (
            <p className="text-xs text-zinc-600">Нет данных по устройствам</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entry.devices.map((d: DeviceDayStat) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-200">{d.name}</span>
                  <span className="w-[52px] text-right font-mono text-[10.5px] text-zinc-500">
                    {fmtTime(d.seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">Распределение</div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              {entry.apps.slice(0, 8).map((a, i) => (
                <span
                  key={i}
                  style={{
                    width: `${(a.seconds / (total || 1)) * 100}%`,
                    background: a.color,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
            {entry.apps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {entry.apps.slice(0, 5).map((a) => (
                  <span key={a.name} className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                    <span className="max-w-[110px] truncate">{a.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HourHeatmap({
  hourly,
  onHover,
}: {
  hourly: HourlyData;
  onHover: (cell: { date: string; label: string; hour: number; total: number } | null) => void;
}) {
  const daysArr = hourly.days;
  const max = hourly.maxHourTotal || 1;
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[600px]">
        <div className="flex">
          <div className="w-8 flex-shrink-0" />
          <div className="grid flex-1 grid-cols-12 gap-[3px]">
            {hourLabels.map((h) => (
              <span
                key={h}
                className="font-mono text-[9px] leading-none text-zinc-600"
                style={{ gridColumn: "span 3 / span 3" }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-[3px]">
          {daysArr.map((d) => (
            <div key={d.date} className="flex items-center gap-[3px]">
              <div className="w-8 flex-shrink-0 text-[9.5px] leading-none text-zinc-500">
                {d.label}
              </div>
              <div
                className="grid flex-1 gap-[3px]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {d.hours.map((h) => {
                  const ratio = h.total / max;
                  const bg =
                    h.total === 0
                      ? "rgba(123,111,240,0.04)"
                      : `rgba(123,111,240,${(0.14 + ratio * 0.85).toFixed(3)})`;
                  return (
                    <div
                      key={h.hour}
                      onMouseEnter={() =>
                        onHover({ date: d.date, label: d.label, hour: h.hour, total: h.total })
                      }
                      onMouseLeave={() => onHover(null)}
                      onClick={() =>
                        onHover({ date: d.date, label: d.label, hour: h.hour, total: h.total })
                      }
                      className="h-4 w-full cursor-default rounded-[3px] transition-transform hover:scale-110"
                      style={{ background: bg }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex">
          <div className="w-8 flex-shrink-0" />
          <div className="grid flex-1 grid-cols-12 gap-[3px]">
            {hourLabels.map((h) => (
              <span
                key={h}
                className="font-mono text-[9px] leading-none text-zinc-700"
                style={{ gridColumn: "span 3 / span 3" }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppSeriesChart({
  app,
  onAppClick,
}: {
  app: { name: string; color: string; perDay: { date: string; label: string; seconds: number }[] };
  onAppClick: (name: string) => void;
}) {
  const max = Math.max(...app.perDay.map((p) => p.seconds), 1);
  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-300">
          <span className="h-2 w-2 rounded-full" style={{ background: app.color }} />
          {app.name} — по дням
        </span>
        <button
          onClick={() => onAppClick(app.name)}
          className="text-[10px] text-zinc-500 transition hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
      <div className="flex h-16 items-end gap-1">
        {app.perDay.map((p) => (
          <div
            key={p.date}
            title={`${p.label} ${fmtDate(p.date)} · ${fmtTime(p.seconds)}`}
            className="group flex flex-1 flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(4, (p.seconds / max) * 100)}%`,
                background: app.color,
                opacity: p.seconds > 0 ? 0.8 : 0.12,
              }}
            />
            <span className="font-mono text-[8.5px] text-zinc-600">
              {p.seconds > 0 ? p.label : "·"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── recharts tooltips ──────────────────────────────────────── */

function DailyTooltip({
  active,
  payload,
  deviceMeta,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  deviceMeta: DeviceMeta[];
}) {
  if (!active || !payload?.[0]) return null;
  const first = payload[0];
  const chartDay = first as unknown as { payload: ChartDay };
  const d = chartDay?.payload;
  if (!d) return null;

  const metaById = new Map(deviceMeta.map((m) => [m.id, m]));
  const devices = Object.entries(d.devices)
    .map(([id, sec]) => ({ meta: metaById.get(id), sec }))
    .filter((x) => x.meta && x.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  return (
    <div className="min-w-[190px] rounded-lg border border-zinc-700/50 bg-surface-2 p-3 shadow-xl">
      <div className="mb-1.5 font-display text-[13px] font-semibold text-zinc-100">
        {fmtDate(d.date)}
      </div>
      <div className="mb-2 text-lg font-bold text-zinc-100">{fmtTime(d.total)}</div>

      {devices.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {devices.slice(0, 4).map(({ meta, sec }) => (
            <div key={meta!.id} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: meta!.color }} />
              <span className="flex-1 truncate">{meta!.name}</span>
              <span className="font-mono text-zinc-300">{fmtTime(sec)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-800 pt-1.5">
        {d.apps.length === 0 ? (
          <div className="text-[10.5px] text-zinc-600">нет данных по приложениям</div>
        ) : (
          <div className="flex flex-col gap-1">
            {d.apps.slice(0, 4).map((a) => (
              <div key={a.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                <span className="flex-1 truncate">{a.name}</span>
                <span className="font-mono text-zinc-300">{fmtTime(a.seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PieTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload: { color: string } }[];
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-surface-2 px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2 text-sm text-zinc-200">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.payload.color }} />
        <b>{p.name}</b>
        <span className="text-zinc-400">{fmtTime(p.value ?? 0)}</span>
      </div>
    </div>
  );
}
