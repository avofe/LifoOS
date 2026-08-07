const DEFAULT_LOCATION = "Volokolamsk";

let location: string | null = null;

export function initWeatherLocation(loc?: string) {
  location = loc && loc.trim() ? loc.trim() : null;
}

export function setWeatherLocation(loc?: string) {
  location = loc && loc.trim() ? loc.trim() : null;
}

export function getWeatherLocation(): string {
  return location ?? DEFAULT_LOCATION;
}

export interface WeatherData {
  condition: string;
  temp: string;
  feelsLike: string;
  wind: string;
  humidity: string;
  forecast: { day: string; condition: string; tempMax: string; tempMin: string }[];
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const r = await fetch(`https://wttr.in/${encodeURIComponent(getWeatherLocation())}?format=j1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const json = await r.json();

    const cc = json.current_condition?.[0];
    if (!cc) return null;

    const forecast =
      json.weather?.slice(0, 3).map((d: any) => ({
        day: d.date,
        condition: d.hourly?.[0]?.weatherDesc?.[0]?.value ?? "",
        tempMax: d.maxtempC ?? "",
        tempMin: d.mintempC ?? "",
      })) ?? [];

    return {
      condition: cc.weatherDesc?.[0]?.value ?? "",
      temp: `${cc.temp_C ?? "?"}°C`,
      feelsLike: `${cc.FeelsLikeC ?? "?"}°C`,
      wind: `${cc.windspeedKmph ?? "?"} км/ч`,
      humidity: `${cc.humidity ?? "?"}%`,
      forecast,
    };
  } catch {
    return null;
  }
}
