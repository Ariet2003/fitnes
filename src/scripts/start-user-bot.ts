#!/usr/bin/env ts-node

import { userTelegramBot } from '../telegram-bot/user-bot';

if (process.env.NODE_ENV !== 'production') {
  console.log('🚀 Запуск пользовательского Telegram бота...');
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📧 Получен сигнал SIGINT. Останавливаем бота...');
  }
  userTelegramBot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📧 Получен сигнал SIGTERM. Останавливаем бота...');
  }
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

if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Пользовательский бот запущен. Нажмите Ctrl+C для остановки.');
}
