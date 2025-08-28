# 🐳 Docker Setup для Fitnes приложения

## Предварительные требования

1. **Установите Docker Desktop** для Windows:
   - Скачайте с официального сайта: https://www.docker.com/products/docker-desktop/
   - Установите и запустите Docker Desktop
   - Убедитесь, что Docker Engine запущен

2. **Проверьте установку:**
   ```powershell
   docker --version
   docker-compose --version
   ```

## ⚙️ Настройка переменных окружения

**ВАЖНО!** Перед запуском создайте файл `.env` с вашими данными:

```powershell
copy docker.env.example .env
```

Отредактируйте `.env` файл и добавьте ваши реальные значения:
- DATABASE_URL - строка подключения к PostgreSQL
- Telegram Bot токены
- S3/Swift настройки для Timeweb

## 🚀 Быстрый запуск

### Вариант 1: Автоматический запуск (PowerShell)
```powershell
# Запустите PowerShell от имени администратора
.\start-docker.ps1
```

### Вариант 2: Ручной запуск

1. **Запустите Docker Desktop** (если не запущен)

2. **Убедитесь, что .env файл создан и заполнен**

3. **Соберите и запустите контейнеры:**
   ```powershell
   docker-compose up --build -d
   ```

4. **Дождитесь запуска приложения** (примерно 10-15 секунд)

5. **Синхронизируйте базу данных:**
   ```powershell
   docker-compose exec app npx prisma db push
   ```

## 📋 Доступные сервисы

После успешного запуска будут доступны:

- **🌐 Основное приложение**: http://localhost:3000
- **🤖 Telegram бот пользователя**: запущен в отдельном контейнере
- **🗄️ База данных**: внешний PostgreSQL (Neon Database)

## 🔧 Управление контейнерами

### Просмотр логов
```powershell
# Все сервисы
docker-compose logs -f

# Только приложение
docker-compose logs -f app

# Только Telegram бот
docker-compose logs -f telegram-bot
```

### Остановка сервисов
```powershell
docker-compose down
```

### Перезапуск с пересборкой
```powershell
docker-compose down
docker-compose up --build -d
```

### Очистка всех данных
```powershell
docker-compose down -v
docker system prune -a
```

## ⚙️ Настройка переменных окружения

1. **Скопируйте файл с переменными:**
   ```powershell
   copy docker.env .env
   ```

2. **Отредактируйте `.env` файл** и добавьте ваши реальные значения:
   - Telegram Bot токены
   - AWS S3 настройки
   - Другие секретные ключи

## 🐛 Устранение неполадок

### Docker Desktop не запущен
```
error during connect: Get "http://...": The system cannot find the file specified.
```
**Решение**: Запустите Docker Desktop и дождитесь полной загрузки.

### Порты заняты
```
Error response from daemon: port is already allocated
```
**Решение**: Остановите процессы, использующие порты 3000, 5432, 8080 или измените порты в docker-compose.yml.

### Ошибки миграции базы данных
```
Error: P1001: Can't reach database server
```
**Решение**: Дождитесь полного запуска PostgreSQL (может занять до 30 секунд при первом запуске).

### Проблемы с сборкой
```
failed to solve with frontend dockerfile.v0
```
**Решение**: Убедитесь, что все файлы на месте и попробуйте пересобрать:
```powershell
docker-compose build --no-cache
```

## 📊 Мониторинг

### Проверка статуса контейнеров
```powershell
docker-compose ps
```

### Использование ресурсов
```powershell
docker stats
```

### Подключение к контейнеру
```powershell
# К приложению
docker-compose exec app sh

# К базе данных
docker-compose exec postgres psql -U postgres -d fitnes
```

## 🔄 Обновление приложения

1. Остановите контейнеры:
   ```powershell
   docker-compose down
   ```

2. Получите последние изменения из Git

3. Пересоберите и запустите:
   ```powershell
   docker-compose up --build -d
   ```

4. Выполните новые миграции (если есть):
   ```powershell
   docker-compose exec app npx prisma migrate deploy
   ```
