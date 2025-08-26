// Утилиты для работы с Telegram API
// Для использования необходимо создать бота через @BotFather и получить TOKEN

import { prisma } from './prisma';

interface TelegramMessage {
  chat_id: string;
  text: string;
  photo?: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

class TelegramService {
  private botToken: string | null = null;
  private baseUrl: string = '';

  constructor() {
    // Токен будет загружен из БД при первом использовании
  }

  // Получение токена бота из базы данных
  private async getBotToken(): Promise<string> {
    if (this.botToken) {
      return this.botToken;
    }

    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'admin_bot_token' }
      });

      if (!setting?.value) {
        throw new Error('Токен Telegram бота не найден в настройках. Убедитесь, что настройка admin_bot_token существует в таблице Setting.');
      }

      this.botToken = setting.value;
      this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
      
      return this.botToken;
    } catch (error) {
      console.error('Ошибка при получении токена Telegram бота из БД:', error);
      throw error;
    }
  }

  // Сброс кэшированного токена (для обновления настроек)
  public clearTokenCache(): void {
    this.botToken = null;
    this.baseUrl = '';
  }

  // Отправка текстового сообщения
  async sendMessage(chatId: string, text: string, options?: {
    parse_mode?: 'HTML' | 'Markdown';
    disable_web_page_preview?: boolean;
  }): Promise<TelegramResponse> {
    const botToken = await this.getBotToken();
    
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    try {
      const message: TelegramMessage = {
        chat_id: chatId,
        text,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка при отправке сообщения в Telegram:', error);
      throw error;
    }
  }

  // Отправка фото с подписью
  async sendPhoto(chatId: string, photoUrl: string, caption?: string, options?: {
    parse_mode?: 'HTML' | 'Markdown';
  }): Promise<TelegramResponse> {
    const botToken = await this.getBotToken();
    
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    try {
      const message: TelegramMessage = {
        chat_id: chatId,
        text: '', // Не используется для фото
        photo: photoUrl,
        caption,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chat_id,
          photo: message.photo,
          caption: message.caption,
          parse_mode: message.parse_mode
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка при отправке фото в Telegram:', error);
      throw error;
    }
  }

  // Массовая рассылка сообщений
  async sendBulkMessages(
    chatIds: string[],
    message: {
      title: string;
      text: string;
      photoUrl?: string;
    },
    options?: {
      delay?: number; // Задержка между сообщениями в мс
      batchSize?: number; // Размер батча
    }
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ chatId: string; error: string }>;
  }> {
    const { delay = 100, batchSize = 30 } = options || {};
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ chatId: string; error: string }>
    };

    // Формируем текст сообщения
    const fullText = message.title ? `*${message.title}*\n\n${message.text}` : message.text;

    // Обрабатываем батчами для избежания rate limits
    for (let i = 0; i < chatIds.length; i += batchSize) {
      const batch = chatIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (chatId) => {
        try {
          let result: TelegramResponse;

          if (message.photoUrl) {
            result = await this.sendPhoto(chatId, message.photoUrl, fullText, {
              parse_mode: 'Markdown'
            });
          } else {
            result = await this.sendMessage(chatId, fullText, {
              parse_mode: 'Markdown'
            });
          }

          if (result.ok) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              chatId,
              error: result.description || 'Неизвестная ошибка'
            });
          }

          // Задержка между отправками
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            chatId,
            error: error.message || 'Ошибка при отправке'
          });
        }
      });

      await Promise.all(batchPromises);

      // Задержка между батчами
      if (i + batchSize < chatIds.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 10));
      }
    }

    return results;
  }

  // Проверка валидности токена
  async validateToken(): Promise<boolean> {
    try {
      const botToken = await this.getBotToken();
      if (!botToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/getMe`);
      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('Ошибка при проверке токена:', error);
      return false;
    }
  }

  // Получение информации о боте
  async getBotInfo(): Promise<any> {
    const botToken = await this.getBotToken();
    
    if (!botToken) {
      throw new Error('Telegram Bot Token не настроен');
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка при получении информации о боте:', error);
      throw error;
    }
  }
}

// Создаем единственный экземпляр сервиса
export const telegramService = new TelegramService();

// Вспомогательные функции
export const formatTelegramMessage = (title: string, content: string): string => {
  // Экранируем специальные символы Markdown
  const escapeMarkdown = (text: string): string => {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  };

  const escapedTitle = escapeMarkdown(title);
  const escapedContent = escapeMarkdown(content);

  return `*${escapedTitle}*\n\n${escapedContent}`;
};

export const validateTelegramId = (telegramId: string): boolean => {
  // Telegram ID должен быть числом
  return /^\d+$/.test(telegramId);
};

// Типы для TypeScript
export type {
  TelegramMessage,
  TelegramResponse
};
