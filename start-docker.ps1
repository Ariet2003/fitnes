# PowerShell скрипт для запуска Fitnes приложения в Docker

Write-Host "🚀 Запуск Fitnes приложения в Docker..." -ForegroundColor Green

# Проверяем, что Docker установлен
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker не установлен. Пожалуйста, установите Docker Desktop." -ForegroundColor Red
    exit 1
}

# Проверяем, что Docker Compose установлен
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose." -ForegroundColor Red
    exit 1
}

# Останавливаем существующие контейнеры
Write-Host "🛑 Останавливаем существующие контейнеры..." -ForegroundColor Yellow
docker-compose down

# Собираем и запускаем контейнеры
Write-Host "🔨 Собираем и запускаем контейнеры..." -ForegroundColor Yellow
docker-compose up --build -d

# Проверяем наличие .env файла
if (!(Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден!" -ForegroundColor Yellow
    Write-Host "📋 Скопируйте docker.env.example в .env и заполните переменные:" -ForegroundColor Yellow
    Write-Host "   copy docker.env.example .env" -ForegroundColor Cyan
    Write-Host "   Затем отредактируйте .env файл с вашими данными" -ForegroundColor Cyan
    exit 1
}

# Ждем запуска приложения
Write-Host "⏳ Ожидание запуска приложения..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Синхронизируем базу данных с внешним PostgreSQL
Write-Host "🗄️  Синхронизируем базу данных..." -ForegroundColor Yellow
docker-compose exec app npx prisma db push

Write-Host "✅ Приложение запущено!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Приложение доступно по адресу: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🤖 Telegram бот пользователя запущен в отдельном контейнере" -ForegroundColor Cyan
Write-Host "🗄️  База данных: внешний PostgreSQL (Neon)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Полезные команды:" -ForegroundColor Yellow
Write-Host "   Логи приложения: docker-compose logs -f app" -ForegroundColor Gray
Write-Host "   Логи бота: docker-compose logs -f telegram-bot" -ForegroundColor Gray
Write-Host "   Статус: docker-compose ps" -ForegroundColor Gray
Write-Host "   Остановка: docker-compose down" -ForegroundColor Gray
