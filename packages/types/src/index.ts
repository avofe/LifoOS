/* ── YouTube ── */
export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumb: string | null;
}

export interface TrackedChannel {
  id: string;
  name: string;
}

export interface YouTubeSearchResult {
  id: string;
  name: string;
  thumb: string | null;
}

/* ── Subscriptions ── */
export interface Subscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentAt: string;
  category: string | null;
  notes: string | null;
  daysUntilPayment: number;
}

export interface SubsStats {
  total: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

/* ── Twitch ── */
export interface TwitchStreamer {
  id: string;
  login: string;
  displayName: string;
  online: boolean;
  title: string | null;
  game: string | null;
  viewers: number;
  startedAt: string | null;
  uptime: string | null;
}

/* ── Screen Time ── */
export interface WeekDay {
  label: string;
  height: string;
  over: boolean;
  today: boolean;
}

export interface AppStat {
  name: string;
  width: string;
  color: string;
  time: string;
}

export interface ScreenTimeData {
  totalToday: string | null;
  weekDays: WeekDay[];
  apps: AppStat[];
}

export interface DayApp {
  name: string;
  color: string;
  seconds: number;
}

export interface DailyEntry {
  date: string;
  label: string;
  total: number;
  apps: DayApp[];
}

export interface TopApp {
  name: string;
  color: string;
  total: number;
}

export interface WeekComparison {
  current: number;
  previous: number;
  diffPercent: number;
}

export interface AnalyticsData {
  daily: DailyEntry[];
  topApps: TopApp[];
  weekComparison: WeekComparison;
  todayTotal: number;
}

/* ── Devices / multi-device breakdown ── */
export type DeviceType = "desktop" | "mobile" | "tablet";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  os: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface DeviceScreenTime {
  id: string;
  name: string;
  type: DeviceType;
  totalToday: string | null;
  apps: AppStat[];
}

export interface DeviceBreakdown {
  devices: DeviceScreenTime[];
  totalToday: string | null;
  weekDays: WeekDay[];
  apps: AppStat[];
}

/* ── Timeline ── */
export interface TimelineEvent {
  time: string;
  type: "youtube" | "twitch" | "subscription" | "system";
  title: string;
  description?: string;
  dot: "green" | "accent" | "default" | "orange";
  ts: number;
}

/* ── AI Briefing ── */
export type BriefSubStatus = "critical" | "upcoming" | "overdue";

export interface BriefSub {
  name: string;
  amount: string;
  daysLeft: number;
  status: BriefSubStatus;
}

export interface BriefData {
  summary: string;
  weather?: string;
  subscriptions: BriefSub[];
  youtube: string;
  twitch?: string;
  screentime: string;
  quickActions: string[];
}

export interface BriefLatestResponse {
  brief: BriefData | null;
  type: "morning" | "evening" | null;
  createdAt?: string;
}

export interface BriefGenerateResponse {
  brief: BriefData;
  type: "morning" | "evening";
}

export interface AiChatResponse {
  response: string;
}

/* ── API Error ── */
export interface ValidationError {
  error: string;
  details: { path: string; message: string }[];
}
