#!/bin/bash

echo "🚀 Запуск Fitnes приложения в Docker..."

# Проверяем, что Docker установлен
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker и Docker Compose."
    exit 1
fi

# Проверяем, что Docker Compose установлен
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down

# Собираем и запускаем контейнеры
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose up --build -d

# Ждем запуска базы данных
echo "⏳ Ожидание запуска PostgreSQL..."
sleep 10

# Выполняем миграции Prisma
echo "🗄️  Выполняем миграции базы данных..."
docker-compose exec app npx prisma migrate deploy

# Генерируем Prisma client
echo "🔧 Генерируем Prisma client..."
docker-compose exec app npx prisma generate

echo "✅ Приложение запущено!"
echo ""
echo "📱 Приложение доступно по адресу: http://localhost:3000"
echo "🗄️  Adminer (управление БД) доступен по адресу: http://localhost:8080"
echo "   - Сервер: postgres"
echo "   - Пользователь: postgres"
echo "   - Пароль: postgres123"
echo "   - База данных: fitnes"
echo ""
echo "📋 Для просмотра логов: docker-compose logs -f"
echo "🛑 Для остановки: docker-compose down"



