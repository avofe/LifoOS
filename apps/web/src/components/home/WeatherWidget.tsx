"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { WeatherData } from "@lifeos/types";
import { CardSkeleton } from "./SectionCard";

const DAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function dayName(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return DAYS[d.getDay()];
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const fetchData = useCallback(() => {
    apiGet<WeatherData>("/api/weather").then((d) => setWeather(d));
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-surface p-[16px_18px]">
      {weather === null ? (
        <div className="flex flex-col gap-3">
          <CardSkeleton className="h-[14px] w-1/3" />
          <div className="flex gap-3">
            <CardSkeleton className="h-[42px] w-[42px]" />
            <CardSkeleton className="h-[42px] w-2/3" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Погода
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none text-zinc-100">{weather.temp}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-zinc-200">{weather.condition}</div>
              <div className="text-[11px] text-zinc-500">
                ощущается {weather.feelsLike} · ветер {weather.wind}
              </div>
            </div>
          </div>
          {weather.forecast.length > 0 && (
            <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-2.5">
              {weather.forecast.map((f) => (
                <div
                  key={f.day}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-lg bg-surface-2/60 px-1 py-1.5"
                >
                  <span className="font-mono text-[9.5px] uppercase text-zinc-500">
                    {dayName(f.day)}
                  </span>
                  <span className="truncate text-[10px] text-zinc-300" title={f.condition}>
                    {f.condition}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {f.tempMin}…{f.tempMax}°
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
