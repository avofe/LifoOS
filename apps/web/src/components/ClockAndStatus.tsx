"use client";

import { useEffect, useState } from "react";
import { getAccessKey } from "@/lib/api";

const DAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTHS = [
  "ЯНВАРЯ", "ФЕВРАЛЯ", "МАРТА", "АПРЕЛЯ", "МАЯ", "ИЮНЯ",
  "ИЮЛЯ", "АВГУСТА", "СЕНТЯБРЯ", "ОКТЯБРЯ", "НОЯБРЯ", "ДЕКАБРЯ",
];

function authedFetch(url: string) {
  const headers: Record<string, string> = {};
  const key = getAccessKey();
  if (key) headers["x-api-key"] = key;
  return fetch(url, { headers }).then((r) => r.ok);
}

type ServiceStatus = Record<string, boolean>;

type ServerStats = {
  cpu: { pct: number };
  ram: { pct: number };
} | null;

export function ClockAndStatus() {
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [stats, setStats] = useState<ServerStats>(null);

  useEffect(() => {
    function tick() {
      const d = new Date();
      setTime(`${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function check() {
      const apiOk = await fetch("/api/health").then((r) => r.ok).catch(() => false);

      if (apiOk) {
        const health = await fetch("/api/health").then((r) => r.json()).catch(() => null);
        if (health && typeof health.cpu?.pct === "number") {
          setStats({ cpu: { pct: health.cpu.pct }, ram: { pct: health.ram.pct } });
        }
      }

      const checks = apiOk
        ? await Promise.allSettled([
            authedFetch("/api/youtube/videos"),
            authedFetch("/api/twitch/streams"),
            authedFetch("/api/screentime"),
            authedFetch("/api/subscriptions/stats"),
          ])
        : [];

      setStatus({
        API: apiOk,
        ...(apiOk
          ? {
              YouTube: checks[0].status === "fulfilled" && checks[0].value,
              Twitch: checks[1].status === "fulfilled" && checks[1].value,
              "Screen Time": checks[2].status === "fulfilled" && checks[2].value,
              Подписки: checks[3].status === "fulfilled" && checks[3].value,
            }
          : {}),
      });
    }
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="font-mono text-[10px] tracking-wider text-zinc-500">
        {time}
      </div>
      <div className="flex items-center gap-2.5">
        {status &&
          Object.entries(status).map(([label, ok]) => {
            const isApi = label === "API";
            const dotClass = ok
              ? "bg-emerald-400 shadow-[0_0_4px_#3ECF6E]"
              : isApi
                ? "bg-red-400 shadow-[0_0_4px_#F07070]"
                : "bg-amber-400";
            return (
              <div
                key={label}
                title={label}
                className="flex items-center gap-1 text-[10.5px] text-zinc-500"
              >
                <span className={`h-[5px] w-[5px] rounded-full ${dotClass}`} />
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        {stats && (
          <div
            title={`CPU ${stats.cpu.pct}% · RAM ${stats.ram.pct}%`}
            className="flex items-center gap-1 text-[10.5px] text-zinc-500"
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                stats.ram.pct >= 90
                  ? "bg-red-400 shadow-[0_0_4px_#F07070]"
                  : stats.ram.pct >= 70
                    ? "bg-amber-400"
                    : "bg-emerald-400 shadow-[0_0_4px_#3ECF6E]"
              }`}
            />
            <span className="hidden md:inline">CPU {stats.cpu.pct}% · RAM {stats.ram.pct}%</span>
          </div>
        )}
      </div>
    </>
  );
}
