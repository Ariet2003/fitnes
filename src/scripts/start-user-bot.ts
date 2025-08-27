#!/usr/bin/env ts-node

import { userTelegramBot } from '../telegram-bot/user-bot';

console.log('🚀 Запуск пользовательского Telegram бота...');

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  console.log('\n📧 Получен сигнал SIGINT. Останавливаем бота...');
  userTelegramBot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📧 Получен сигнал SIGTERM. Останавливаем бота...');
  userTelegramBot.stop();
  process.exit(0);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанная ошибка Promise:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
  userTelegramBot.stop();
  process.exit(1);
});

console.log('✅ Пользовательский бот запущен. Нажмите Ctrl+C для остановки.');
