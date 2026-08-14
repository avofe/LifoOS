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

export interface CalendarPaymentItem {
  id: string;
  name: string;
  cost: number;
  currency: string;
}

export interface PaymentCalendarDay {
  day: number;
  total: number;
  items: CalendarPaymentItem[];
}

export interface PaymentCalendarData {
  month: string;
  total: number;
  days: PaymentCalendarDay[];
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
  incomplete: boolean;
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
  forecast?: ScreenTimeForecast | null;
}

export interface ScreenTimeForecast {
  projected: string;
  projectedSec: number;
  elapsedFraction: number;
}

export interface DayApp {
  name: string;
  color: string;
  seconds: number;
}

export interface DeviceDayStat {
  id: string;
  name: string;
  type: DeviceType;
  color: string;
  seconds: number;
}

export interface DailyEntry {
  date: string;
  label: string;
  total: number;
  apps: DayApp[];
  devices: DeviceDayStat[];
  incomplete: boolean;
  partial: boolean;
}

export interface TopApp {
  name: string;
  color: string;
  total: number;
}

export interface WeekComparison {
  current: number;
  previous: number;
  diffPercent: number | null;
}

export interface AnalyticsData {
  daily: DailyEntry[];
  topApps: TopApp[];
  weekComparison: WeekComparison;
  todayTotal: number;
}

/* ── Hourly heatmap ── */
export interface HourlyCell {
  hour: number;
  total: number;
}

export interface HourlyDay {
  date: string;
  label: string;
  hours: HourlyCell[];
}

export interface HourlyData {
  days: HourlyDay[];
  maxHourTotal: number;
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

/* ── Screen Time Limits ── */
export interface ScreenLimitInfo {
  limitMin: number | null;
  usedSec: number;
  over: boolean;
}

export interface ScreenLimitsData {
  total: ScreenLimitInfo;
  apps: { name: string; limitMin: number | null; usedSec: number; over: boolean }[];
}

/* ── Raw apps (rename / recolor) ── */
export interface RawAppInfo {
  key: string;
  name: string;
  seconds: number;
  time: string;
  color: string;
}

export interface RawAppsData {
  apps: RawAppInfo[];
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
  type: "morning" | "evening" | "weekly" | null;
  createdAt?: string;
}

export interface BriefGenerateResponse {
  brief: BriefData;
  type: "morning" | "evening" | "weekly";
}

export interface AiChatResponse {
  response: string;
}

/* ── Weather ── */
export interface WeatherForecastDay {
  day: string;
  condition: string;
  tempMax: string;
  tempMin: string;
}

export interface WeatherData {
  condition: string;
  temp: string;
  feelsLike: string;
  wind: string;
  humidity: string;
  forecast: WeatherForecastDay[];
}

/* ── Streak ── */
export interface StreakStatus {
  enabled: boolean;
  streak: number;
  record: number;
  todayInNorm: boolean;
  todayTotalSec: number;
  limitMin: number | null;
  bestUpdatedAt: string | null;
}

/* ── Day Summary ── */
export interface SummaryYesterday {
  totalSec: number;
  limitMin: number | null;
  over: boolean;
  apps: { name: string; color: string; seconds: number }[];
}

export interface SummaryPayment {
  name: string;
  amount: string;
  daysLeft: number;
}

export interface SummaryStream {
  displayName: string;
  game: string | null;
  viewers: number;
  title: string | null;
  uptime: string | null;
}

export interface SummarySleep {
  day: string;
  bedAt: string;
  wakeAt: string;
  durationMin: number;
  note: string | null;
}

export interface DaySummary {
  yesterday: SummaryYesterday | null;
  todayTotalSec: number;
  todayOver: boolean;
  todayRemainingSec: number | null;
  forecast: ScreenTimeForecast | null;
  streak: { streak: number; record: number; enabled: boolean } | null;
  payments: SummaryPayment[];
  videos: { id: string; title: string; channel: string; publishedAt: string }[];
  streams: SummaryStream[];
  plan: { id: string; text: string; done: boolean }[];
  sleep: SummarySleep | null;
}

/* ── Focus ── */
export interface FocusSessionView {
  id: string;
  deviceId: string;
  startedAt: string;
  endsAt: string;
  remainingSec: number;
}

export interface FocusStatus {
  active: FocusSessionView | null;
}

/* ── API Error ── */
export interface ValidationError {
  error: string;
  details: { path: string; message: string }[];
}
