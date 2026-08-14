export function todayKey(): string {
  const d = new Date();
  return formatKey(d);
}

export function formatKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysKey(day: string, offset: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return formatKey(date);
}

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function dayLabel(day: string, short = false): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const wd = WEEKDAYS[date.getDay()];
  const monthNames = [
    "янв", "фев", "мар", "апр", "мая", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек",
  ];
  const label = `${wd}, ${d} ${monthNames[date.getMonth()]}`;
  return short ? wd : label;
}

export function lastDays(n: number, endKey?: string): string[] {
  const end = endKey ?? todayKey();
  return Array.from({ length: n }, (_, i) => addDaysKey(end, i - (n - 1)));
}

export function isToday(day: string): boolean {
  return day === todayKey();
}
