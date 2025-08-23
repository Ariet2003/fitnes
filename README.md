# Fitness Club Admin Panel

Система управления фитнес клубом с авторизацией через Telegram.

## Возможности

- Система авторизации с двухфакторной аутентификацией через Telegram
- JWT токены для безопасной аутентификации
- Отдельные поля ввода для каждой цифры кода
- Таймеры: код действителен 5 минут, повторная отправка через 2 минуты
- Темный минималистичный дизайн с современными иконками
- Управление клиентами, тарифами и посещениями
- База данных на PostgreSQL с Prisma ORM
- TypeScript для безопасности типов
- Next.js 14 с App Router

## Установка

1. Клонируйте репозиторий
2. Установите зависимости:
   ```bash
   npm install
   ```

3. Создайте файл `.env` со следующими переменными:
   ```
   DATABASE_URL="postgresql://postgres:12345@localhost:5432/fitnes"
   JWT_SECRET="your-super-secret-jwt-key-here"
   ```

4. Настройте базу данных:
   ```bash
   npx prisma migrate dev
   ```

5. Добавьте админские данные в базу:
   ```sql
   INSERT INTO settings (key, value, created_at, updated_at) 
   VALUES ('admin', '{"login": "admin", "password": "$2b$12$FhWEaBZNI6iB.7nD.E4fQu7Xak.jd8KsueJZMDTCGGeSTK1a/kGym"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
   
   INSERT INTO settings (key, value, created_at, updated_at) 
   VALUES ('admin_telegram', '728991415', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
   
   INSERT INTO settings (key, value, created_at, updated_at) 
   VALUES ('admin_bot_token', '8127660112:AAEkXMO5Sq65TKlNpe-PhiEJ_6Ed6Ng7zCQ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
   ```

6. Запустите сервер разработки:
   ```bash
   npm run dev
   ```

7. Откройте [http://localhost:3000](http://localhost:3000) в браузере

## Структура проекта

```
src/
├── app/
│   ├── api/auth/        # API роуты авторизации
│   ├── dashboard/       # Админ панель
│   └── page.tsx         # Страница входа
├── components/
│   └── auth/           # Компоненты авторизации
├── lib/
│   ├── db.ts           # Настройка Prisma
│   └── auth.ts         # Утилиты авторизации
└── middleware.ts       # Защита роутов
```

## Данные для входа

- Логин: `admin`
- Пароль: `password` (хеш уже в базе)
- Telegram ID админа: `728991415`

## Скрипты

- `npm run dev` - Запуск сервера разработки
- `npm run build` - Сборка для продакшена
- `npm run start` - Запуск продакшен сервера
- `npm run lint` - Проверка кода
- `npm run format` - Форматирование кода