# LifeOS

Персональный AI-дашборд для управления цифровой жизнью. Monorepo на базе pnpm с десктоп-приложением на [Tauri 2.0](https://v2.tauri.app/), фронтендом на [Next.js 14](https://nextjs.org/) и бэкендом на [Express](https://expressjs.com/) + [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/).

## Возможности

- **Дашборд** — обзор ключевых показателей и событий
- **День (/day)** — задачи, привычки, сон
- **Подписки** — учёт, категории, напоминания и статусы платежей
- **YouTube** — лента новых видео из отслеживаемых каналов
- **Twitch** — отслеживание онлайн/офлайн статуса стримеров
- **Экранное время** — аналитика через [ActivityWatch](https://activitywatch.net/) с разбивкой по приложениям и периодам
- **Таймлайн** — хронология событий и активности

## Технологии

| Компонент | Стек |
|-----------|------|
| Десктоп | Tauri 2.0 (Rust) |
| Фронтенд | Next.js 14, TypeScript, Tailwind CSS |
| Бэкенд | Express, Prisma |
| База данных | PostgreSQL 17 |
| AI | Groq |
| Экранное время | ActivityWatch |

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10
- [PostgreSQL](https://www.postgresql.org/) >= 17
- [ActivityWatch](https://activitywatch.net/) — опционально, для модуля экранного времени

### Установка

```bash
git clone https://github.com/D1edDuck/LifeOS.git
cd LifeOS
pnpm install
```

### Настройка переменных окружения

Создайте `.env` файлы по образцу. **Никогда не коммитьте реальные ключи и строки подключения.**

#### `packages/db/.env`
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
```

#### `apps/api/.env`
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

### Опциональные переменные

| Переменная | Описание |
|------------|----------|
| `YOUTUBE_API_KEY` | Ключ YouTube Data API v3 |
| `TWITCH_CLIENT_ID` | Client ID Twitch API |
| `TWITCH_CLIENT_SECRET` | Client Secret Twitch API |

### Инициализация базы данных

```bash
pnpm db:push
```

### Запуск в режиме разработки

```bash
pnpm dev
```

По умолчанию API доступен по адресу: `http://localhost:4000`

### Сборка десктопного приложения

```bash
pnpm desktop:build
```

Готовый установщик будет находиться по пути:  
`apps/desktop/src-tauri/target/release/bundle/`

## Структура проекта

```text
LifeOS/
├── apps/
│   ├── api/      # Express API
│   ├── web/      # Next.js веб-клиент
│   └── desktop/  # Tauri 2.0 десктоп-обёртка
├── packages/
│   ├── db/       # Prisma схема и клиент
│   └── types/      # Общие TypeScript-типы
└── scripts/      # Вспомогательные скрипты
```

## Безопасность

- Все секреты должны храниться только в `.env` файлах. Убедитесь, что они добавлены в `.gitignore`.
- Перед публикацией репозитория проверьте отсутствие `.env`, дампов БД, логов с токенами и приватных ключей.
- Используйте отдельные API-ключи для разработки и продакшена.

## Лицензия

[MIT](LICENSE)
