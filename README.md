# Telegram Counter

Полностью бесплатный сайт-счётчик, который считает сообщения по ключевым словам из приватной Telegram группы и обновляется в реальном времени.

**Стек**: Cloudflare Workers + Supabase + GitHub Pages (всё бесплатно).

---

## Шаг 1. Создать Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправьте `/newbot`.
3. Введите имя бота (например, `Counter Bot`).
4. Введите username бота (например, `MyCounter2024Bot`).
5. Сохраните **токен** — он понадобится позже.
6. Отправьте `/setprivacy` → выберите вашего бота → **Disable** (чтобы бот видел все сообщения в группе).
7. Добавьте бота в вашу приватную группу (любой участник группы может это сделать).

---

## Шаг 2. Создать Supabase проект

1. Зарегистрируйтесь на [supabase.com](https://supabase.com).
2. Нажмите **New project**.
3. Введите имя (например, `telegram-counter`).
4. Установите пароль для БД (сохраните его).
5. Выберите регион (ближайший к вам).
6. Дождитесь создания проекта (~1-2 минуты).

### 2.1. Создать таблицу и функцию

В разделе **SQL Editor** → **New query** вставьте и выполните:

```sql
-- Создание таблицы счётчиков
CREATE TABLE counters (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Функция атомарного инкремента
CREATE OR REPLACE FUNCTION increment_counter(p_id TEXT, p_label TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO counters (id, label, value, updated_at)
  VALUES (p_id, p_label, 1, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    value = counters.value + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### 2.2. Включить Real-time

1. **Project Settings** → **API** → скопируйте **Project URL** и **anon public key** (для фронтенда).
2. **Project Settings** → **API** → скопируйте **service_role key** (для Worker).
3. **Database** → **Replication** → в разделе **Replication** нажмите **Enable Realtime** → в таблице `counters` включите тумблер.

### 2.3. Настроить RLS (безопасность)

**SQL Editor** → **New query**:

```sql
-- Разрешить анонимам только чтение (для фронтенда)
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON counters
  FOR SELECT USING (true);
```

---

## Шаг 3. Деплой Cloudflare Worker

1. Зарегистрируйтесь на [cloudflare.com](https://cloudflare.com).
2. **Workers & Pages** → **Create application** → **Create Worker**.
3. Назовите (например, `telegram-counter`).
4. Удалите код по умолчанию и вставьте содержимое файла [`worker.js`](./worker.js).
5. Нажмите **Deploy**.

### 3.1. Добавить переменные окружения

В редакторе Worker перейдите в **Settings** → **Variables** → **Add variable**:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | `8680711300:AAGZJGYgrnsRZmNcSc-nZckq8UYQyLeDBco` |
| `CHAT_ID` | `-1002393584014` |
| `ALLOWED_USERS` | `6745097836` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` (ваш Project URL) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (ваш service_role key) |
| `KEYWORDS` | `{"ПМ-Гросса":"📊 ПМ-Гросса"}` |

Нажмите **Save and deploy**.

### 3.2. Установить webhook в Telegram

Выполните эту команду (замените `ВАШ_ТОКЕН` и `ВАШ_ВОРКЕР`):

```
https://api.telegram.org/bot8680711300:AAGZJGYgrnsRZmNcSc-nZckq8UYQyLeDBco/setWebhook?url=https://telegram-counter.ВАШ_ПОДДОМЕН.workers.dev
```

Откройте эту ссылку в браузере. Должен прийти ответ: `{"ok": true, "description": "Webhook was set"}`.

---

## Шаг 4. Фронтенд на GitHub Pages

1. Создайте репозиторий на GitHub (публичный).
2. Откройте файл [`index.html`](./index.html) и замените в нём:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';    // ваш Project URL
const SUPABASE_ANON_KEY = 'eyJ...';                  // ваш anon public key
```

3. Загрузите `index.html` в репозиторий.
4. **Settings** → **Pages** → выберите ветку `main` и папку `/ (root)` → **Save**.
5. Через минуту сайт будет доступен по адресу `https://ВАШ_АККАУНТ.github.io/ВАШ_РЕПОЗИТОРИЙ`.

---

## Шаг 5. Готово

1. Отправьте сообщение `ПМ-Гросса` в вашу группу от пользователя `6745097836`.
2. Счётчик на сайте обновится в реальном времени.

---

## Как изменить ключевые слова

Обновите переменную `KEYWORDS` в Cloudflare Worker:

```json
{"ПМ-Гросса":"📊 ПМ-Гросса", "новое_слово":"📌 Новый счётчик"}
```

---

## Как добавить второго пользователя

Добавьте его user_id через запятую:

```
ALLOWED_USERS = 6745097836, 1234567890
```

---

## Как сбросить счётчик

**SQL Editor** → выполните:

```sql
UPDATE counters SET value = 0 WHERE id = 'ПМ-Гросса';
```
