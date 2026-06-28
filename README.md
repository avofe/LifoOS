# LifeOS

Персональный AI-дашборд для управления цифровой жизнью. Tauri 2.0 десктоп-приложение с бэкендом на Express + Prisma + PostgreSQL.

## Возможности

- **Дашборд + AI-брифинг** — утренняя/вечерняя сводка от Groq AI на основе ваших данных
- **Подписки** — CRUD, категории, контроль платежей, статусы (overdue / critical / upcoming)
- **YouTube** — лента новых видео из отслеживаемых каналов
- **Twitch** — онлайн/офлайн стримеры, статус в реальном времени
- **Экранное время** — аналитика через ActivityWatch с разбивкой по дням/неделям, категоризация по приложениям
- **Таймлайн** — хронология событий и активности
- **AI-чат** — естественно-языковые запросы по своим данным (Groq AI, llama-3.3-70b)

## Технологии

| Компонент | Стек |
|-----------|------|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Express + Prisma |
| База данных | PostgreSQL 17 |
| AI | Groq (llama-3.3-70b-versatile) |
| Экранное время | ActivityWatch |
| Погода | wttr.in |

## Быстрый старт

### Требования

- Node.js ≥ 20
- pnpm ≥ 10
- PostgreSQL 17 (локально)
- ActivityWatch (для экранного времени)

### Установка

```bash
git clone https://github.com/D1edDuck/LifeOS.git
cd LifeOS
pnpm install
```

### Настройка БД

Создайте `.env` в `packages/db/`:

```
DATABASE_URL="postgresql://postgres:root@localhost:5432/lifeos"
```

Примените схему:

```bash
pnpm db:push
```

### Запуск (dev)

```bash
pnpm dev
```

Откройте http://localhost:4000.

### Переменные окружения

Создайте `.env` в `apps/api/`:

```
DATABASE_URL="postgresql://postgres:root@localhost:5432/lifeos"
GROQ_API_KEY="gsk_..."
```

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `GROQ_API_KEY` | API-ключ Groq (бесплатно, 14 400 запросов/день) |
| `YOUTUBE_API_KEY` | API-ключ YouTube Data v3 (опционально) |
| `TWITCH_CLIENT_ID` | Twitch Client-ID (опционально) |

## Десктоп-сборка

```bash
pnpm desktop:build
```

NSIS-установщик: `apps/desktop/src-tauri/target/release/bundle/nsis/`

## Структура проекта

```
lifeos/
├── apps/
│   ├── api/          # Express сервер (маршруты, сервисы)
│   ├── web/          # Next.js клиент (App Router)
│   └── desktop/      # Tauri 2.0 обёртка
├── packages/
│   ├── db/           # Prisma схема + клиент
│   └── types/        # Общие TypeScript типы
├── scripts/          # bundle-api, smoke-test
└── Plan/             # Документация и архитектура
```

## Лицензия

MIT
