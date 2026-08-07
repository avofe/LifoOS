"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { AnalyticsData, DailyEntry, DayApp, Device } from "@lifeos/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";

function fmt(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  if (h === 0) return `${m}м`;
  return `${h}ч ${m}м`;
}

function fmtShort(totalSec: number): string {
  const h = totalSec / 3600;
  return `${h.toFixed(1)}ч`;
}

function barFill(total: number): string {
  const hrs = total / 3600;
  if (hrs <= 6) return "#3ECF6E";
  if (hrs <= 8) return "#F5A623";
  return "#F07070";
}

interface DailyChartTooltipProps {
  active?: boolean;
  payload?: { payload: DailyEntry }[];
}

function DailyChartTooltip({ active, payload }: DailyChartTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const hrs = (d.total / 3600).toFixed(1);
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-surface-2 p-3 shadow-xl">
      <div className="mb-1.5 font-display text-sm font-semibold text-zinc-200">
        {d.date} · {d.label}
      </div>
      <div className="mb-2 text-lg font-bold text-zinc-100">{hrs}ч</div>
      <div className="flex flex-col gap-1">
        {d.apps.slice(0, 5).map((a) => (
          <div key={a.name} className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
            <span className="flex-1">{a.name}</span>
            <span className="font-mono text-zinc-300">{fmtShort(a.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PieTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-surface-2 px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2 text-sm text-zinc-200">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.payload.color }} />
        <b>{p.name}</b>
        <span className="text-zinc-400">{fmt(p.value)}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [limitSec, setLimitSec] = useState<number | null>(null);

  useEffect(() => {
    apiGet<Device[]>("/api/devices").then((d) => setDevices(d ?? []));
    apiGet<{ screenLimitTotal?: number | null }>("/api/settings").then((s) => {
      if (s && typeof s.screenLimitTotal === "number" && s.screenLimitTotal > 0) {
        setLimitSec(s.screenLimitTotal * 60);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    const query = deviceId ? `?device=${deviceId}` : "";
    apiGet<AnalyticsData>(`/api/screentime/analytics${query}`)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId]);

  const wc = data?.weekComparison;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 bg-black p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Экранное время"
          subtitle="Аналитика"
        />
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-accent/60"
        >
          <option value="">Все устройства</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

          {loading && (
            <p className="py-12 text-center text-sm text-zinc-600">
              Загрузка...
            </p>
          )}

          {!loading && !data && (
            <p className="py-12 text-center text-sm text-zinc-600">
              Нет данных. Убедись что ActivityWatch запущен.
            </p>
          )}

          {data && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-surface p-5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Сегодня
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-bold text-zinc-100">
                    {fmt(data.todayTotal)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-surface p-5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Эта неделя
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-bold text-zinc-100">
                    {fmt(wc?.current ?? 0)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    ~{Math.round((wc?.current ?? 0) / 7 / 3600 * 10) / 10}ч/день
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-surface p-5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    vs прошлая неделя
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-zinc-100">
                      {wc && wc.diffPercent > 0 ? "+" : ""}{wc?.diffPercent ?? 0}%
                    </span>
                    <span className={`text-xs font-medium ${wc && wc.diffPercent <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {wc && wc.diffPercent <= 0 ? "↓ меньше" : "↑ больше"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {wc ? fmt(wc.previous) : "—"}
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-zinc-800 bg-surface p-5">
                <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Дневная активность · 14 дней
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis
                      dataKey={(d: DailyEntry) => d.date.slice(5)}
                      tick={{ fill: "#52526A", fontSize: 10, fontFamily: "Space Mono" }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fill: "#52526A", fontSize: 10, fontFamily: "Space Mono" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v / 3600}ч`}
                    />
                    <Tooltip content={<DailyChartTooltip />} cursor={{ fill: "rgba(123,111,240,0.06)" }} />
                    {limitSec !== null && (
                      <ReferenceLine
                        y={limitSec}
                        stroke="#F07070"
                        strokeDasharray="4 3"
                        strokeOpacity={0.5}
                        label={{
                          value: `${Math.round(limitSec / 3600)}ч`,
                          position: "right",
                          fill: "#F07070",
                          fontSize: 10,
                          fontFamily: "Space Mono",
                        }}
                      />
                    )}
                    <Bar
                      dataKey="total"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                      fill="#7B6FF0"
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            rx={3}
                            ry={3}
                            fill={barFill(payload.total)}
                            opacity={0.85}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="col-span-1 rounded-xl border border-zinc-800 bg-surface p-5 lg:col-span-2">
                  <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Распределение по приложениям
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.topApps.slice(0, 5)}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {data.topApps.slice(0, 5).map((app, i) => (
                          <Cell key={i} fill={app.color} opacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="col-span-1 rounded-xl border border-zinc-800 bg-surface p-5 lg:col-span-3">
                  <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Топ приложений (14 дней)
                  </div>
                  {data.topApps.length === 0 ? (
                    <p className="py-6 text-center text-xs text-zinc-600">
                      Нет данных по приложениям
                    </p>
                  ) : (
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const totalAll = data.topApps.slice(0, 5).reduce((s, a) => s + a.total, 0);
                      const maxTotal = data.topApps[0].total;
                      return (
                        <>
                          {data.topApps.slice(0, 5).map((app, i) => {
                            const pct = ((app.total / totalAll) * 100).toFixed(1);
                            return (
                              <div key={app.name}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-zinc-400 w-4 flex-shrink-0">{i + 1}</span>
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: app.color }} />
                                    <span className="text-zinc-200 truncate">{app.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <span className="font-mono text-zinc-400">{fmt(app.total)}</span>
                                    <span className="font-mono text-[10px] text-zinc-600 w-[40px] text-right">{pct}%</span>
                                  </div>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${(app.total / maxTotal) * 100}%`,
                                      background: app.color,
                                      opacity: 0.7,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
  );
}
