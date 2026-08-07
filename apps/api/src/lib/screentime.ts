import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { getTimezone, getDayStart, getNextDayStart, fmtTime } from "./time";

const AW_BASE = "http://127.0.0.1:5600/api/0/";
const DAY_LIMIT = 28800; // 8 hours

interface AwEvent {
  timestamp: string;
  duration: number;
  data: Record<string, string>;
}

interface CategoryMap {
  [key: string]: { name: string; color: string; seconds: number };
}

const SYSTEM_EXCLUDE = [
  /^taskmgr/i,
  /^explorer/i,
  /^runtimebroker/i,
  /^sihost/i,
  /^svchost/i,
  /^searchapp/i,
  /^lockapp/i,
  /^system/i,
  /^background\s*task/i,
  /^windows(?!terminal)/i,
  /^microsoft\s*windows/i,
  /^security\s*health/i,
  /^com\.android\.(launcher|systemui|settings|phone|dialer|mms|email|contacts|permissioncontroller|packageinstaller|documentsui|intentresolver|vending|gms|gsf|htmlviewer|providers\.)/i,
  /^com\.google\.android\.(permissioncontroller|packageinstaller|documentsui|vending|gms|gsf)/i,
  /^com\.oplus\.(sos|linker|systemui|launcher|settings|cast)/i,
  /^com\.coloros\.(sos|systemui|launcher|settings|permissionmanager|safecenter)/i,
  /^(android|com\.android)$/i,
  /^(system\s*launcher|launcher|установщик\s*пакетов|контролер\s*разрешений|сервисы\s*google\s*play|телефонные\s*службы|система\s*android|google\s*play|play\s*store)$/i,
];

function isSystem(app: string, title: string): boolean {
  return SYSTEM_EXCLUDE.some((re) => re.test(app) || re.test(title));
}

const BROWSER_SUFFIXES = [
  /[—–-]\s*(Mozilla\s*)?Firefox$/i,
  /[—–-]\s*Google\s*Chrome$/i,
  /[—–-]\s*Microsoft\s*Edge$/i,
  /[—–-]\s*Opera$/i,
  /[—–-]\s*Brave$/i,
  /[—–-]\s*Vivaldi$/i,
];

const BROWSER_NOISE = [
  /проблема\s*при\s*загрузке/i,
  /новая\s*вкладка/i,
  /^new\s*tab$/i,
  /^about:/i,
  /^chrome:\/\//i,
  /^edge:\/\//i,
  /^about:blank/i,
  /^about:newtab/i,
  /^about:home/i,
  /^settings$/i,
  /^настройки$/i,
  /^extensions$/i,
  /^расширения$/i,
  /^bookmarks$/i,
  /^закладки$/i,
  /^history$/i,
  /^история$/i,
  /^downloads$/i,
  /^загрузки$/i,
  /^add-ons/i,
  /^дополнения/i,
  /^private\s*browsing/i,
  /^приватный\s*просмотр/i,
  /^whatsapp\s*web$/i,
];

function isBrowserNoise(site: string): boolean {
  return BROWSER_NOISE.some((re) => re.test(site));
}

function extractBrowserSite(title: string): string | null {
  let site = title;
  for (const suffix of BROWSER_SUFFIXES) {
    site = site.replace(suffix, "").trim();
  }
  if (!site || site === title) return null;
  if (isBrowserNoise(site)) return null;
  return site;
}

const APP_CATEGORIES: { match: (app: string, title: string) => boolean; name: string; color: string }[] = [
  { match: (_, t) => /youtube/i.test(t), name: "YouTube", color: "#F07070" },
  { match: (_, t) => /twitch/i.test(t), name: "Twitch", color: "#9146FF" },
  { match: (a, t) => /code|\.tsx?$|\.jsx?$|\.py$|\.go$|\.rs$/i.test(a + " " + t), name: "VS Code", color: "#7B6FF0" },
  { match: (a, t) => /telegram|tdesktop/i.test(a) || /telegram/i.test(t), name: "Telegram", color: "#2AABEE" },
  { match: (a, _) => /slack/i.test(a), name: "Slack", color: "#4A154B" },
  { match: (a, _) => /spotify/i.test(a), name: "Spotify", color: "#1DB954" },
  { match: (a, _) => /discord/i.test(a), name: "Discord", color: "#5865F2" },
  { match: (a, _) => /terminal|cmd|powershell|wsl|mintty|windows Term/i.test(a), name: "Терминал", color: "#52526A" },
  { match: (a, t) => /chrome|firefox|edge|browser|opera/i.test(a), name: "", color: "#52526A" },
];

function categorize(app: string, title: string): { name: string; color: string; skip: boolean } {
  if (isSystem(app, title)) return { name: "", color: "#52526A", skip: true };

  for (const c of APP_CATEGORIES) {
    if (c.match(app, title)) {
      if (c.name === "") {
        const site = extractBrowserSite(title);
        if (site && site.length < 40) {
          return { name: site, color: c.color, skip: false };
        }
        return { name: "Браузер", color: c.color, skip: false };
      }
      return { name: c.name, color: c.color, skip: false };
    }
  }
  return { name: app || "Другое", color: "#52526A", skip: false };
}

// ─────────────────────────────────────────────────────────────
// DB-backed aggregation (multi-device, timezone-aware)
// ─────────────────────────────────────────────────────────────

interface DbEvent {
  timestamp: Date;
  duration: number;
  app: string;
  title: string | null;
}

async function fetchEventsFromDb(
  deviceId: string | undefined,
  start: Date,
  end: Date
): Promise<DbEvent[]> {
  return prisma.screenEvent.findMany({
    where: {
      userId: USER_ID,
      timestamp: { gte: start, lt: end },
      ...(deviceId ? { deviceId } : {}),
    },
    orderBy: { timestamp: "asc" },
  });
}

function aggregateDay(events: DbEvent[]): {
  total: number;
  apps: { name: string; color: string; seconds: number }[];
} {
  const total = events.reduce((sum, e) => sum + e.duration, 0);
  const cats: CategoryMap = {};

  for (const e of events) {
    if (e.duration < 1) continue;
    const cat = categorize(e.app, e.title ?? "");
    if (cat.skip) continue;
    if (!cats[cat.name]) {
      cats[cat.name] = { name: cat.name, color: cat.color, seconds: 0 };
    }
    cats[cat.name].seconds += e.duration;
  }

  const apps = Object.values(cats)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 8);

  return { total, apps };
}

export async function fetchScreenTimeFromDb(deviceId?: string): Promise<{
  totalToday: string;
  weekDays: { label: string; height: string; over: boolean; today: boolean }[];
  apps: { name: string; width: string; color: string; time: string }[];
} | null> {
  const tz = await getTimezone();
  const now = new Date();

  const todayStart = getDayStart(0, tz, now);
  const weekStart = getDayStart(-6, tz, now);
  const end = getNextDayStart(todayStart);

  const events = await fetchEventsFromDb(deviceId, weekStart, end);
  if (events.length === 0) return null;

  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const dayTotals: number[] = [];
  const dayStarts: Date[] = [];

  for (let i = -6; i <= 0; i++) {
    const ds = getDayStart(i, tz, now);
    dayStarts.push(ds);
    const de = getNextDayStart(ds);
    const total = events
      .filter((e) => e.timestamp.getTime() >= ds.getTime() && e.timestamp.getTime() < de.getTime())
      .reduce((sum, e) => sum + e.duration, 0);
    dayTotals.push(total);
  }

  const maxDay = Math.max(...dayTotals, 1);

  const weekDays = dayTotals.map((total, i) => {
    const d = dayStarts[i];
    const isToday = d.toISOString().slice(0, 10) === todayStart.toISOString().slice(0, 10);
    return {
      label: dayLabels[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1],
      height: `${Math.max(Math.round((total / maxDay) * 100), 8)}%`,
      over: total > DAY_LIMIT,
      today: isToday,
    };
  });

  const todayEvents = events.filter(
    (e) => e.timestamp.getTime() >= todayStart.getTime() && e.timestamp.getTime() < end.getTime()
  );

  const totalToday = todayEvents.reduce((sum, e) => sum + e.duration, 0);
  const categories: CategoryMap = {};

  for (const e of todayEvents) {
    if (e.duration < 1) continue;
    const cat = categorize(e.app, e.title ?? "");
    if (cat.skip) continue;
    if (!categories[cat.name]) {
      categories[cat.name] = { name: cat.name, color: cat.color, seconds: 0 };
    }
    categories[cat.name].seconds += e.duration;
  }

  const sortedApps = Object.values(categories).sort((a, b) => b.seconds - a.seconds);
  const topTotal = sortedApps[0]?.seconds || 1;

  const apps = sortedApps.slice(0, 6).map((a) => ({
    name: a.name,
    width: `${Math.round((a.seconds / topTotal) * 100)}%`,
    color: a.color,
    time: fmtTime(a.seconds),
  }));

  return {
    totalToday: fmtTime(totalToday),
    weekDays,
    apps,
  };
}

export async function fetchAnalyticsFromDb(deviceId?: string): Promise<{
  daily: { date: string; label: string; total: number; apps: { name: string; color: string; seconds: number }[] }[];
  topApps: { name: string; color: string; total: number }[];
  weekComparison: { current: number; previous: number; diffPercent: number };
  todayTotal: number;
} | null> {
  const tz = await getTimezone();
  const now = new Date();

  const firstDay = getDayStart(-13, tz, now);
  const todayStart = getDayStart(0, tz, now);
  const end = getNextDayStart(todayStart);

  const events = await fetchEventsFromDb(deviceId, firstDay, end);
  if (events.length === 0) return null;

  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const daily: { date: string; label: string; total: number; apps: { name: string; color: string; seconds: number }[] }[] = [];

  for (let i = -13; i <= 0; i++) {
    const ds = getDayStart(i, tz, now);
    const de = getNextDayStart(ds);
    const dayEvents = events.filter(
      (e) => e.timestamp.getTime() >= ds.getTime() && e.timestamp.getTime() < de.getTime()
    );
    const { total, apps } = aggregateDay(dayEvents);
    daily.push({
      date: ds.toISOString().slice(0, 10),
      label: dayLabels[ds.getUTCDay()],
      total,
      apps,
    });
  }

  const allApps = new Map<string, { name: string; color: string; total: number }>();
  for (const d of daily) {
    for (const a of d.apps) {
      const existing = allApps.get(a.name);
      if (existing) {
        existing.total += a.seconds;
      } else {
        allApps.set(a.name, { name: a.name, color: a.color, total: a.seconds });
      }
    }
  }

  const topApps = Array.from(allApps.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const weekTotals = [0, 0];
  for (let i = 0; i < daily.length; i++) {
    const dayNum = Math.floor(i / 7);
    if (dayNum === 0) weekTotals[0] += daily[i].total;
    else weekTotals[1] += daily[i].total;
  }

  return {
    daily,
    topApps,
    weekComparison: {
      current: weekTotals[1],
      previous: weekTotals[0],
      diffPercent: weekTotals[0] > 0
        ? Math.round(((weekTotals[1] - weekTotals[0]) / weekTotals[0]) * 100)
        : 0,
    },
    todayTotal: daily[daily.length - 1]?.total ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Live ActivityWatch fallback (same-machine / self-hosted mode)
// ─────────────────────────────────────────────────────────────

async function fetchBuckets(): Promise<Record<string, any>> {
  const r = await fetch(`${AW_BASE}buckets/`, { signal: AbortSignal.timeout(3000) });
  return r.json();
}

async function fetchAwEvents(bucketId: string, start: string, end: string): Promise<AwEvent[]> {
  const url = `${AW_BASE}buckets/${encodeURIComponent(bucketId)}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=10000`;
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  return r.json();
}

export async function fetchScreenTimeFromAw(): Promise<{
  totalToday: string;
  weekDays: { label: string; height: string; over: boolean; today: boolean }[];
  apps: { name: string; width: string; color: string; time: string }[];
} | null> {
  const now = new Date();
  const buckets = await fetchBuckets().catch(() => null);
  if (!buckets) return null;

  const windowBucketId = Object.keys(buckets).find(
    (id) => id.includes("aw-watcher-window") || id.includes("aw-watcher-windows")
  );
  if (!windowBucketId) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekStarts: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    weekStarts.push(d);
  }

  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 1);

  const events = await fetchAwEvents(windowBucketId, weekStarts[0].toISOString(), weekEnd.toISOString()).catch(() => []);
  if (events.length === 0) return null;

  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const dayTotals: number[] = weekStarts.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return events
      .filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      })
      .reduce((sum, e) => sum + e.duration, 0);
  });

  const maxDay = Math.max(...dayTotals, 1);

  const weekDays = dayTotals.map((total, i) => {
    const d = weekStarts[i];
    const isToday = d.toDateString() === now.toDateString();
    return {
      label: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
      height: `${Math.max(Math.round((total / maxDay) * 100), 8)}%`,
      over: total > DAY_LIMIT,
      today: isToday,
    };
  });

  const todayEvents = events.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= startOfToday.getTime() && t < weekEnd.getTime();
  });

  const totalToday = todayEvents.reduce((sum, e) => sum + e.duration, 0);
  const categories: CategoryMap = {};

  for (const e of todayEvents) {
    const app = (e.data.app ?? e.data.application ?? "").trim();
    const title = (e.data.title ?? "").trim();
    if (e.duration < 1) continue;
    const cat = categorize(app, title);
    if (cat.skip) continue;
    if (!categories[cat.name]) {
      categories[cat.name] = { name: cat.name, color: cat.color, seconds: 0 };
    }
    categories[cat.name].seconds += e.duration;
  }

  const sortedApps = Object.values(categories).sort((a, b) => b.seconds - a.seconds);
  const topTotal = sortedApps[0]?.seconds || 1;

  const apps = sortedApps.slice(0, 6).map((a) => ({
    name: a.name,
    width: `${Math.round((a.seconds / topTotal) * 100)}%`,
    color: a.color,
    time: fmtTime(a.seconds),
  }));

  return {
    totalToday: fmtTime(totalToday),
    weekDays,
    apps,
  };
}

export async function fetchAnalyticsFromAw(): Promise<{
  daily: { date: string; label: string; total: number; apps: { name: string; color: string; seconds: number }[] }[];
  topApps: { name: string; color: string; total: number }[];
  weekComparison: { current: number; previous: number; diffPercent: number };
  todayTotal: number;
} | null> {
  const now = new Date();
  const buckets = await fetchBuckets().catch(() => null);
  if (!buckets) return null;

  const windowBucketId = Object.keys(buckets).find(
    (id) => id.includes("aw-watcher-window") || id.includes("aw-watcher-windows")
  );
  if (!windowBucketId) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysBack = 14;
  const dayStarts: Date[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    dayStarts.push(d);
  }

  const endDate = new Date(startOfToday);
  endDate.setDate(endDate.getDate() + 1);

  const events = await fetchAwEvents(windowBucketId, dayStarts[0].toISOString(), endDate.toISOString()).catch(() => []);
  if (events.length === 0) return null;

  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const daily: { date: string; label: string; total: number; apps: { name: string; color: string; seconds: number }[] }[] = dayStarts.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayEvents = events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    const total = dayEvents.reduce((sum, e) => sum + e.duration, 0);
    const cats: CategoryMap = {};

    for (const e of dayEvents) {
      const app = (e.data.app ?? e.data.application ?? "").trim();
      const title = (e.data.title ?? "").trim();
      if (e.duration < 1) continue;
      const cat = categorize(app, title);
      if (cat.skip) continue;
      if (!cats[cat.name]) {
        cats[cat.name] = { name: cat.name, color: cat.color, seconds: 0 };
      }
      cats[cat.name].seconds += e.duration;
    }

    const apps = Object.values(cats)
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8);

    return {
      date: dayStart.toISOString().slice(0, 10),
      label: dayLabels[dayStart.getDay()],
      total,
      apps,
    };
  });

  const allApps = new Map<string, { name: string; color: string; total: number }>();
  for (const d of daily) {
    for (const a of d.apps) {
      const existing = allApps.get(a.name);
      if (existing) {
        existing.total += a.seconds;
      } else {
        allApps.set(a.name, { name: a.name, color: a.color, total: a.seconds });
      }
    }
  }

  const topApps = Array.from(allApps.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const weekTotals = [0, 0];
  for (let i = 0; i < daily.length; i++) {
    const dayNum = Math.floor(i / 7);
    if (dayNum === 0) weekTotals[0] += daily[i].total;
    else weekTotals[1] += daily[i].total;
  }

  return {
    daily,
    topApps,
    weekComparison: {
      current: weekTotals[1],
      previous: weekTotals[0],
      diffPercent: weekTotals[0] > 0
        ? Math.round(((weekTotals[1] - weekTotals[0]) / weekTotals[0]) * 100)
        : 0,
    },
    todayTotal: daily[daily.length - 1]?.total ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Public API: DB first, then live AW, then null (route falls to MOCK)
// ─────────────────────────────────────────────────────────────

export async function fetchScreenTime(deviceId?: string) {
  const fromDb = await fetchScreenTimeFromDb(deviceId);
  if (fromDb) return fromDb;
  return fetchScreenTimeFromAw();
}

export async function fetchAnalytics(deviceId?: string) {
  const fromDb = await fetchAnalyticsFromDb(deviceId);
  if (fromDb) return fromDb;
  return fetchAnalyticsFromAw();
}

export async function fetchDeviceBreakdown(): Promise<{
  devices: {
    id: string;
    name: string;
    type: string;
    totalToday: string | null;
    apps: { name: string; width: string; color: string; time: string }[];
  }[];
  totalToday: string | null;
  weekDays: { label: string; height: string; over: boolean; today: boolean }[];
  apps: { name: string; width: string; color: string; time: string }[];
}> {
  const devices = await prisma.device.findMany({
    where: { userId: USER_ID },
    orderBy: { lastSeenAt: "desc" },
  });

  const perDevice = await Promise.all(
    devices.map((d) => fetchScreenTimeFromDb(d.id))
  );

  const aggregate = await fetchScreenTimeFromDb();

  return {
    devices: devices.map((d, i) => {
      const st = perDevice[i];
      return {
        id: d.id,
        name: d.name,
        type: d.type,
        totalToday: st?.totalToday ?? null,
        apps: st?.apps ?? [],
      };
    }),
    totalToday: aggregate?.totalToday ?? null,
    weekDays: aggregate?.weekDays ?? [],
    apps: aggregate?.apps ?? [],
  };
}
