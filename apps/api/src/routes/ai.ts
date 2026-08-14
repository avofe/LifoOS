import { Router } from "express";
import { createRateLimiter } from "../lib/rate-limit";
import { prisma } from "@lifeos/db";
import { USER_ID } from "../index";
import { queryGroq } from "../lib/gemini";
import { fetchScreenTime, fetchAnalytics } from "../lib/screentime";
import { fetchWeather, getWeatherLocation } from "../lib/weather";
import { validate, chatMessageSchema } from "../validate";
import { fmtTime } from "../lib/time";

async function collectContext() {
  const now = new Date();

  const subs = await prisma.subscription.findMany({
    where: { userId: USER_ID },
    orderBy: { nextPaymentAt: "asc" },
  });

  const integ = await prisma.integration.findUnique({
    where: { userId_service: { userId: USER_ID, service: "youtube" } },
  });
  const channels: { id: string; name: string }[] =
    integ?.config && Array.isArray((integ.config as any).channels)
      ? (integ.config as any).channels
      : [];

  const upcomingSubs = subs.map((s) => {
    const diff = Math.ceil(
      (new Date(s.nextPaymentAt).getTime() - now.getTime()) / 86400000
    );
    return {
      name: s.name,
      amount: `${Number(s.cost)} ${s.currency}`,
      daysLeft: diff,
      status: diff > 2 ? "upcoming" : diff > 0 ? "critical" : "overdue",
    };
  });

  const twInteg = await prisma.integration.findUnique({
    where: { userId_service: { userId: USER_ID, service: "twitch" } },
  });
  const streamers: { login: string; name: string }[] =
    twInteg?.config && Array.isArray((twInteg.config as any).streamers)
      ? (twInteg.config as any).streamers
      : [];

  const st = await fetchScreenTime().catch(() => null);

  return {
    subscriptions: upcomingSubs,
    channels: channels.map((c) => c.name),
    streamers: streamers.map((s) => s.login),
    screentime: st
      ? {
          totalToday: st.totalToday,
          topApps: st.apps.slice(0, 3).map((a) => `${a.name}: ${a.time}`),
        }
      : null,
  };
}

function getBriefType(): "morning" | "evening" {
  const h = new Date().getHours();
  return h >= 10 && h < 22 ? "morning" : "evening";
}

function stripCodeFences(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : raw).trim();
}

async function generateBriefJson(prompt: string, attempts = 2): Promise<any> {
  let lastErr: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    const raw = await queryGroq(prompt, { jsonMode: true, maxTokens: 800 });
    try {
      return JSON.parse(stripCodeFences(raw));
    } catch (err: any) {
      lastErr = err;
      console.warn(`[ai] brief: invalid JSON from model (attempt ${i + 1})`);
    }
  }

  throw new Error(`Модель вернула некорректный JSON: ${lastErr?.message ?? ""}`);
}

function subLabel(s: { name: string; amount: string; daysLeft: number; status: string }): string {
  if (s.status === "overdue") return `${s.name}: ${s.amount} (ПРОСРОЧЕНА)`;
  if (s.status === "critical") return `${s.name}: ${s.amount}, оплата через ${s.daysLeft} дн. ⚠️`;
  return `${s.name}: ${s.amount}, оплата через ${s.daysLeft} дн.`;
}

function buildPrompt(ctx: Awaited<ReturnType<typeof collectContext>>, type: "morning" | "evening", weatherStr: string): string {
  const subsStr =
    ctx.subscriptions.length > 0
      ? ctx.subscriptions.map(subLabel).join("\n")
      : "нет подписок";

  const ytStr = ctx.channels.length > 0 ? ctx.channels.join(", ") : "нет";
  const twStr = ctx.streamers.length > 0 ? ctx.streamers.join(", ") : "нет";

  const stStr = ctx.screentime
    ? `Сегодня: ${ctx.screentime.totalToday}. Топ: ${ctx.screentime.topApps.join(", ")}`
    : "данные собираются";

  const statusValues = '"upcoming" | "critical" | "overdue"';
  const location = getWeatherLocation();

  if (type === "morning") {
    return `Данные дашборда LifoOS (утро):
- Подписки:
${subsStr}

- YouTube каналы: ${ytStr}
- Twitch стримеры: ${twStr}
- Экранное время вчера: ${stStr}
- Погода в ${location}: ${weatherStr}

Сформируй утренний брифинг в формате JSON:
{
  "summary": "приветствие с погодой и прогнозом на день",
  "weather": "погода сейчас в ${location} и прогноз на день",
  "subscriptions": [
    { "name": "Название", "amount": "сумма", "daysLeft": число, "status": ${statusValues} }
  ],
  "youtube": "коротко про каналы",
  "twitch": "коротко про стримеров",
  "screentime": "коротко про вчерашний экран",
  "quickActions": ["действие 1", "действие 2"]
}

Правила:
- summary — приветствие + погода + прогноз, 2-3 предложения
- weather — что сейчас на улице и что ожидать, не выдумывай
- subscriptions — данные как есть
- youtube — 1 фраза
- twitch — 1 фраза про стримеров
- screentime — 1 фраза про вчера
- quickActions — 1-3 дела на день
- Только JSON, без markdown`;
  }

  return `Данные дашборда LifoOS (вечер):
- Подписки:
${subsStr}

- YouTube каналы: ${ytStr}
- Twitch стримеры: ${twStr}
- Экранное время сегодня: ${stStr}

Сформируй вечерний брифинг в формате JSON:
{
  "summary": "итог дня одним предложением",
  "subscriptions": [
    { "name": "Название", "amount": "сумма", "daysLeft": число, "status": ${statusValues} }
  ],
  "youtube": "коротко про каналы и новые видео",
  "twitch": "коротко про стримеров сегодня",
  "screentime": "анализ сегодняшнего экранного времени — сколько, где, вывод",
  "quickActions": ["на завтра 1", "на завтра 2"]
}

Правила:
- summary — итог дня, что произошло, 1 предложение
- subscriptions — данные как есть, status: upcoming (>2 дня), critical (<=2 дня), overdue (просрочена)
- youtube — 1 фраза
- twitch — 1 фраза
- screentime — анализ дня, не просто время, а осмысленный вывод
- quickActions — 1-3 дела на завтра
- Только JSON, без markdown`;
}

function buildWeeklyPrompt(
  ctx: Awaited<ReturnType<typeof collectContext>>,
  analytics: Awaited<ReturnType<typeof fetchAnalytics>>
): string {
  const subsStr =
    ctx.subscriptions.length > 0
      ? ctx.subscriptions.map(subLabel).join("\n")
      : "нет подписок";

  const ytStr = ctx.channels.length > 0 ? ctx.channels.join(", ") : "нет";
  const twStr = ctx.streamers.length > 0 ? ctx.streamers.join(", ") : "нет";

  const dailyStr = analytics?.daily.length
    ? analytics.daily.map((d) => `${d.date}: ${fmtTime(d.total)}`).join(", ")
    : "нет данных";

  const cmp = analytics?.weekComparison;
  const cmpStr =
    cmp && cmp.diffPercent !== null
      ? `${cmp.diffPercent > 0 ? "+" : ""}${cmp.diffPercent}% (${fmtTime(cmp.current)} против ${fmtTime(cmp.previous)} за прошлую неделю)`
      : "нет данных для сравнения";

  const topAppsStr =
    analytics && analytics.topApps.length > 0
      ? analytics.topApps
          .slice(0, 5)
          .map((a) => `${a.name}: ${fmtTime(a.total)}`)
          .join(", ")
      : "нет данных";

  const statusValues = '"upcoming" | "critical" | "overdue"';

  return `Данные дашборда LifoOS (недельный итог, последние 7 дней):
- Подписки:
${subsStr}

- YouTube каналы: ${ytStr}
- Twitch стримеры: ${twStr}
- Экранное время за неделю (дата: время): ${dailyStr}
- Динамика неделя к неделе: ${cmpStr}
- Топ приложений за неделю: ${topAppsStr}

Сформируй недельную сводку в формате JSON:
{
  "summary": "итог недели, 2-3 предложения",
  "subscriptions": [
    { "name": "Название", "amount": "сумма", "daysLeft": число, "status": ${statusValues} }
  ],
  "youtube": "коротко про каналы",
  "twitch": "коротко про стримеров",
  "screentime": "анализ недели — динамика, топ, вывод",
  "quickActions": ["дело 1", "дело 2"]
}

Правила:
- summary — итог недели: что было важно, 2-3 предложения
- subscriptions — данные как есть
- youtube — 1 фраза
- twitch — 1 фраза
- screentime — анализ недели, не просто сумма: динамика, топ-приложения, вывод
- quickActions — 1-3 дела на следующую неделю
- Только JSON, без markdown`;
}

export function createAiRouter(): Router {
  const router: Router = Router();
  const chatLimiter = createRateLimiter(60_000, 10);

  router.get("/brief/latest", async (req, res) => {
    try {
      const typeParam = typeof req.query.type === "string" ? req.query.type : null;

      if (typeParam === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 8);

        const briefing = await prisma.briefing.findFirst({
          where: {
            userId: USER_ID,
            type: "weekly",
            createdAt: { gte: weekAgo },
          },
          orderBy: { createdAt: "desc" },
        });

        res.json({
          brief: briefing?.content ?? null,
          type: briefing ? "weekly" : null,
          createdAt: briefing?.createdAt ?? null,
        });
        return;
      }

      const type = getBriefType();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const briefing = await prisma.briefing.findFirst({
        where: {
          userId: USER_ID,
          type,
          createdAt: { gte: todayStart },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!briefing) {
        res.json({ brief: null });
        return;
      }

      res.json({ brief: briefing.content, type: briefing.type, createdAt: briefing.createdAt });
    } catch (err) {
      console.error("[ai] GET /brief/latest", err);
      res.json({ brief: null });
    }
  });

  router.post("/brief/weekly", async (_req, res) => {
    try {
      const ctx = await collectContext();
      const analytics = await fetchAnalytics(undefined, 14).catch(() => null);

      const prompt = buildWeeklyPrompt(ctx, analytics);
      const brief = await generateBriefJson(prompt);

      await prisma.briefing.create({
        data: {
          type: "weekly",
          content: brief,
          userId: USER_ID,
        },
      });

      res.json({ brief, type: "weekly" });
    } catch (err: any) {
      console.error("[ai] POST /brief/weekly", err);
      res.status(500).json({ error: "Weekly AI brief error" });
    }
  });

  router.post("/brief", async (_req, res) => {
    try {
      const type = getBriefType();
      const ctx = await collectContext();
      let weatherStr = "";

      if (type === "morning") {
        const w = await fetchWeather();
        if (w) {
          weatherStr = `${w.condition}, ${w.temp}, ощущается ${w.feelsLike}, ветер ${w.wind}, влажность ${w.humidity}`;
          if (w.forecast.length > 0) {
            weatherStr += `. Прогноз: ${w.forecast.map((f) => `${f.day}: ${f.condition}, ${f.tempMin}…${f.tempMax}`).join("; ")}`;
          }
        } else {
          weatherStr = "данные о погоде временно недоступны";
        }
      }

      const prompt = buildPrompt(ctx, type, weatherStr);
      const brief = await generateBriefJson(prompt);

      await prisma.briefing.create({
        data: {
          type,
          content: brief,
          userId: USER_ID,
        },
      });

      res.json({ brief, type });
    } catch (err: any) {
      console.error("[ai] POST /brief", err);
      res.status(500).json({ error: "AI brief error" });
    }
  });

  router.post("/chat", validate(chatMessageSchema), async (req, res) => {
    if (!chatLimiter(req.ip ?? "unknown")) {
      res.status(429).json({ error: "Слишком много запросов, попробуйте через минуту" });
      return;
    }
    try {
      const { message } = req.body;

      const ctx = await collectContext();

      const subsStr =
        ctx.subscriptions.length > 0
          ? ctx.subscriptions.map(subLabel).join("; ")
          : "нет подписок";

      const ytStr = ctx.channels.length > 0 ? ctx.channels.join(", ") : "нет";
      const twStr = ctx.streamers.length > 0 ? ctx.streamers.join(", ") : "нет";

      const stStr = ctx.screentime
        ? `${ctx.screentime.totalToday} (${ctx.screentime.topApps.join(", ")})`
        : "данные собираются";

      const prompt = `Ты — AI-ассистент дашборда LifoOS. Отвечай кратко и по делу на русском языке, используя только переданные данные. Не выдумывай то, чего нет в контексте.

Контекст (текущие данные дашборда):
- Подписки: ${subsStr}
- YouTube каналы: ${ytStr}
- Twitch стримеры: ${twStr}
- Экранное время сегодня: ${stStr}

Вопрос пользователя: ${message}

Ответь на русском, 1-3 предложения, без лишнего. Если в контексте нет данных для ответа — так и скажи.`;

      const response = await queryGroq(prompt);
      res.json({ response: response.trim() });
    } catch (err: any) {
      console.error("[ai] POST /chat", err);
      res.status(500).json({ error: "AI chat error" });
    }
  });

  return router;
}
