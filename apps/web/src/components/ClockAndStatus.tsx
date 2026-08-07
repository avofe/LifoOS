"use client";

import { useEffect, useState } from "react";

const DAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTHS = [
  "ЯНВАРЯ", "ФЕВРАЛЯ", "МАРТА", "АПРЕЛЯ", "МАЯ", "ИЮНЯ",
  "ИЮЛЯ", "АВГУСТА", "СЕНТЯБРЯ", "ОКТЯБРЯ", "НОЯБРЯ", "ДЕКАБРЯ",
];

type ServiceStatus = Record<string, boolean>;

export function ClockAndStatus() {
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<ServiceStatus | null>(null);

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

      const checks = apiOk
        ? await Promise.allSettled([
            fetch("/api/youtube/videos").then((r) => r.ok),
            fetch("/api/twitch/streams").then((r) => r.ok),
            fetch("/api/screentime").then((r) => r.ok),
            fetch("/api/subscriptions/stats").then((r) => r.ok),
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
      </div>
    </>
  );
}
