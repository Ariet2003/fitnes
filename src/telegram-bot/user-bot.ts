import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

class UserTelegramBot {
  private bot: TelegramBot | null = null;
  private botToken: string | null = null;
  private isRunning = false;
  private lastMessages: Map<number, number[]> = new Map(); // chatId -> messageIds[]
  private lastBotMessage: Map<number, { messageId: number, hasPhoto: boolean }> = new Map(); // chatId -> lastBotMessage info

  constructor() {
    this.init();
  }

  // Инициализация бота
  private async init() {
    try {
      const token = await this.getBotToken();
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
      this.isRunning = true;
      console.log('🤖 Пользовательский Telegram бот запущен и готов к работе');
    } catch (error) {
      console.error('❌ Ошибка при инициализации пользовательского бота:', error);
    }
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
        throw new Error('Токен пользовательского Telegram бота не найден в настройках. Убедитесь, что настройка admin_bot_token существует в таблице Setting.');
      }

      this.botToken = setting.value;
      return this.botToken;
    } catch (error) {
      console.error('Ошибка при получении токена пользовательского Telegram бота из БД:', error);
      throw error;
    }
  }

  // Настройка обработчиков команд
  private setupHandlers() {
    if (!this.bot) return;

    // Обработка команды /start
    this.bot.onText(/\/start/, async (msg: Message) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id?.toString();
      const firstName = msg.from?.first_name || '';
      const lastName = msg.from?.last_name || '';
      const username = msg.from?.username || '';

      console.log(`👤 Пользователь ${firstName} ${lastName} (@${username}) запустил бота. Telegram ID: ${telegramId}`);

      if (!telegramId) {
        await this.sendMessage(chatId, '❌ Произошла ошибка при получении вашего Telegram ID. Попробуйте еще раз.');
        return;
      }

      try {
        // Проверяем, есть ли пользователь в базе данных
        const existingClient = await prisma.client.findUnique({
          where: { telegramId: telegramId },
          include: {
            subscriptions: {
              where: { status: 'active' },
              include: { tariff: true }
            }
          }
        });

        if (existingClient) {
          // Пользователь существует - показываем главное меню
          // НЕ удаляем сообщения при первом входе (команда /start)
          await this.sendWelcomeMenu(chatId, existingClient.fullName);
        } else {
          // Новый пользователь - отправляем приветствие с его ID
          await this.sendNewUserMessage(chatId, telegramId, firstName, lastName);
        }
      } catch (error) {
        console.error('Ошибка при обработке команды /start:', error);
        await this.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже или обратитесь к администратору.');
      }
    });

    // Обработка нажатий на кнопки меню
    this.bot.on('callback_query', async (query: CallbackQuery) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      const telegramId = query.from.id.toString();

      if (!chatId || !data) return;

      try {
        await this.bot!.answerCallbackQuery(query.id);

        // Для кнопок пытаемся редактировать сообщение вместо удаления
        switch (data) {
          case 'subscription':
            await this.handleSubscriptionInfo(chatId, telegramId);
            break;
          case 'subscription_history':
            await this.handleSubscriptionHistory(chatId, telegramId);
            break;
          case 'qr_code':
            await this.handleQRCode(chatId, telegramId);
            break;
          case 'feedback':
            await this.handleFeedback(chatId, telegramId);
            break;
          case 'contacts':
            await this.handleContacts(chatId);
            break;
          case 'products':
            await this.handleProducts(chatId);
            break;
          case 'back_to_menu':
            const client = await prisma.client.findUnique({
              where: { telegramId: telegramId }
            });
            if (client) {
              // Для возврата в главное меню пытаемся редактировать сообщение
              await this.handleBackToMenu(chatId, client.fullName);
            }
            break;
        }
      } catch (error) {
        console.error('Ошибка при обработке callback query:', error);
        await this.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте еще раз.');
      }
    });

    // Обработка любых текстовых сообщений (кроме команд)
    this.bot.on('message', async (msg: Message) => {
      // Игнорируем команды
      if (msg.text?.startsWith('/')) return;
      
      const chatId = msg.chat.id;
      
      // Удаляем предыдущие сообщения при любом новом тексте
      await this.deletePreviousMessages(chatId);
      
      // Можно добавить обработку обычных текстовых сообщений здесь
      // Например, для отзывов и рекомендаций
    });

    // Обработка ошибок polling
    this.bot.on('polling_error', (error: Error) => {
      console.error('Ошибка polling пользовательского бота:', error);
    });
  }

  // Отправка сообщения новому пользователю
  private async sendNewUserMessage(chatId: number, telegramId: string, firstName: string, lastName: string) {
    const name = `${firstName} ${lastName}`.trim() || 'пользователь';
    
    const message = `👋 Привет, ${name}!

Добро пожаловать в наш фитнес-клуб! 

🆔 Ваш Telegram ID: \`${telegramId}\`

Чтобы получить доступ ко всем функциям бота, обратитесь к администратору клуба и сообщите ему этот ID. После регистрации в системе вы сможете:

• Просматривать информацию о своем абонементе
• Получать QR-код для посещения
• Оставлять отзывы и рекомендации
• Просматривать контакты клуба
• Узнавать о наших продуктах

Увидимся в зале! 💪`;

    await this.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  // Обработка возврата в главное меню
  private async handleBackToMenu(chatId: number, fullName: string) {
    const message = `👋 Добро пожаловать, ${fullName}!

Выберите нужный раздел:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Абонемент', callback_data: 'subscription' },
          { text: '📱 QR-код', callback_data: 'qr_code' }
        ],
        [
          { text: '💬 Отзывы', callback_data: 'feedback' },
          { text: '📞 Контакты', callback_data: 'contacts' }
        ],
        [
          { text: '🛍️ Продукты', callback_data: 'products' }
        ]
      ]
    };

    // Проверяем, есть ли приветственная картинка
    const imageUrl = await this.getWelcomeImageUrl();
    const lastMessage = this.lastBotMessage.get(chatId);
    
    if (imageUrl) {
      // Если есть картинка, главное меню должно быть с фото
      if (lastMessage?.hasPhoto) {
        // Редактируем подпись к фото
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendWelcomeMenu(chatId, fullName);
        }
      } else {
        // Последнее сообщение было текстовым, нужно отправить фото
        await this.deletePreviousMessages(chatId);
        await this.sendPhoto(chatId, imageUrl, message, keyboard);
      }
    } else {
      // Если нет картинки, главное меню текстовое
      if (lastMessage?.hasPhoto) {
        // Предыдущее было с фото, отправляем новое текстовое
        await this.deletePreviousMessages(chatId);
        await this.sendMessage(chatId, message, { reply_markup: keyboard });
      } else {
        // Редактируем текстовое сообщение
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendMessage(chatId, message, { reply_markup: keyboard });
        }
      }
    }
  }

  // Отправка главного меню существующему пользователю (только для первого входа)
  private async sendWelcomeMenu(chatId: number, fullName: string) {
    const message = `👋 Добро пожаловать, ${fullName}!

Выберите нужный раздел:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Абонемент', callback_data: 'subscription' },
          { text: '📱 QR-код', callback_data: 'qr_code' }
        ],
        [
          { text: '💬 Отзывы', callback_data: 'feedback' },
          { text: '📞 Контакты', callback_data: 'contacts' }
        ],
        [
          { text: '🛍️ Продукты', callback_data: 'products' }
        ]
      ]
    };

    // Пытаемся отправить картинку с текстом как подписью
    const imageUrl = await this.getWelcomeImageUrl();
    if (imageUrl) {
      await this.sendPhoto(chatId, imageUrl, message, keyboard);
    } else {
      // Если картинки нет, отправляем обычное сообщение
      await this.sendMessage(chatId, message, { reply_markup: keyboard });
    }
  }

  // Обработка информации об абонементе
  private async handleSubscriptionInfo(chatId: number, telegramId: string) {
    try {
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            include: { 
              tariff: true,
              visits: {
                orderBy: { visitDate: 'desc' }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!client || client.subscriptions.length === 0) {
        const message = '❌ У вас нет активных абонементов.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      const subscription = client.subscriptions[0];
      const tariff = subscription.tariff;

      const startDate = new Date(subscription.startDate).toLocaleDateString('ru-RU');
      const endDate = new Date(subscription.endDate).toLocaleDateString('ru-RU');
      const remainingDays = subscription.remainingDays;
      
      // Подсчитываем количество посещений
      const totalVisits = subscription.visits.length;
      const remainingVisits = Math.max(0, tariff.durationDays - totalVisits);

      const message = `📝 Информация о вашем абонементе:

🏷️ **Тариф:** ${tariff.name}
💰 **Стоимость:** ${tariff.price} ₽
⏰ **Время работы:** ${tariff.startTime} - ${tariff.endTime}
📅 **Старт абонемента:** ${startDate}
📅 **Действует до:** ${endDate}
⏳ **Осталось посещений:** ${remainingVisits}
🧊 **Использовано заморозок:** ${subscription.freezeUsed}/${tariff.freezeLimit}

${remainingDays <= 7 ? '⚠️ Ваш абонемент скоро истекает! Не забудьте продлить.' : ''}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📜 История абонементов', callback_data: 'subscription_history' }],
          [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
        ]
      };

      // Используем умную отправку текстового сообщения
      await this.sendTextMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении информации об абонементе:', error);
      const errorMessage = '❌ Ошибка при получении информации об абонементе.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Обработка истории абонементов
  private async handleSubscriptionHistory(chatId: number, telegramId: string) {
    try {
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId },
        include: {
          subscriptions: {
            where: { status: { in: ['completed', 'active'] } },
            include: { tariff: true },
            orderBy: { createdAt: 'desc' },
            take: 4 // Берем 4 (активный + 3 предыдущих)
          }
        }
      });

      if (!client || client.subscriptions.length <= 1) {
        const message = '📜 История абонементов пуста.\n\nУ вас нет предыдущих абонементов.';
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 К абонементу', callback_data: 'subscription' }],
            [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
          ]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      let message = '📜 **История ваших абонементов:**\n\n';
      
      client.subscriptions.forEach((subscription, index) => {
        const tariff = subscription.tariff;
        const startDate = new Date(subscription.startDate).toLocaleDateString('ru-RU');
        const endDate = new Date(subscription.endDate).toLocaleDateString('ru-RU');
        const status = subscription.status === 'active' ? '🟢 Активный' : '⚪ Завершён';
        
        message += `**${index + 1}. ${tariff.name}** ${status}\n`;
        message += `📅 ${startDate} - ${endDate}\n`;
        message += `💰 ${tariff.price} ₽\n`;
        if (index < client.subscriptions.length - 1) {
          message += '\n';
        }
      });

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔙 К абонементу', callback_data: 'subscription' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await this.sendTextMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении истории абонементов:', error);
      const errorMessage = '❌ Ошибка при получении истории абонементов.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Обработка QR-кода
  private async handleQRCode(chatId: number, telegramId: string) {
    try {
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!client || client.subscriptions.length === 0) {
        const message = '❌ У вас нет активных абонементов для получения QR-кода.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      // Генерируем QR-код для посещения
      const qrCode = `QR_${client.id}_${Date.now()}`;
      
      const message = `📱 Ваш QR-код для посещения:

\`${qrCode}\`

Покажите этот код на ресепшене для прохода в зал.

⏰ Код действителен в течение 24 часов.`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Обновить код', callback_data: 'qr_code' }],
          [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
        ]
      };

      await this.sendTextMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при генерации QR-кода:', error);
      const errorMessage = '❌ Ошибка при генерации QR-кода.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Обработка отзывов и рекомендаций
  private async handleFeedback(chatId: number, telegramId: string) {
    const message = `💬 Отзывы и рекомендации

Напишите ваше сообщение, и мы обязательно рассмотрим его.

Вы можете:
• Оставить отзыв о работе клуба
• Сообщить о проблемах
• Предложить улучшения
• Задать вопрос администрации

Просто напишите ваше сообщение следующим сообщением.`;

    const keyboard = {
      inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
    };

    await this.sendTextMessage(chatId, message, keyboard);

    // Здесь можно добавить логику для обработки следующего сообщения как отзыва
  }

  // Обработка контактов
  private async handleContacts(chatId: number) {
    try {
      const contacts = await prisma.contact.findFirst();

      if (!contacts) {
        const message = '❌ Контактная информация не найдена.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      const socialLinks = contacts.socialLinks as any;
      let socialText = '';
      
      if (socialLinks) {
        if (socialLinks.instagram) socialText += `📸 [Instagram](${socialLinks.instagram})\n`;
        if (socialLinks.vk) socialText += `🔵 [ВКонтакте](${socialLinks.vk})\n`;
        if (socialLinks.telegram) socialText += `📱 [Telegram](${socialLinks.telegram})\n`;
      }

      const message = `📞 **Контакты фитнес-клуба**

📱 **Телефон:** ${contacts.phone}
📍 **Адрес:** ${contacts.address}

${socialText}

🗺️ [Посмотреть на карте](${contacts.mapLink})`;

      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };

      await this.sendTextMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении контактов:', error);
      const errorMessage = '❌ Ошибка при получении контактной информации.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Обработка продуктов
  private async handleProducts(chatId: number) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });

      if (products.length === 0) {
        const message = '❌ Продукты не найдены.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      let message = '🛍️ **Наши продукты:**\n\n';

      products.forEach((product, index) => {
        message += `${index + 1}. **${product.name}**\n`;
        message += `   💰 Цена: ${product.price} ₽\n`;
        message += `   📝 ${product.description}\n\n`;
      });

      message += 'Для заказа обратитесь к администратору.';

      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };

      await this.sendTextMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении продуктов:', error);
      const errorMessage = '❌ Ошибка при получении списка продуктов.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Получение URL приветственной картинки
  private async getWelcomeImageUrl(): Promise<string | null> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'welcome_image_url' }
      });
      return setting?.value || null;
    } catch (error) {
      console.error('Ошибка при получении URL приветственной картинки:', error);
      return null;
    }
  }

  // Отправка фото с подписью и клавиатурой
  private async sendPhoto(chatId: number, photoUrl: string, caption: string, keyboard: any) {
    if (!this.bot) return;

    try {
      const sentMessage = await this.bot.sendPhoto(chatId, photoUrl, {
        caption: caption,
        reply_markup: keyboard
      });
      this.addMessageToHistory(chatId, sentMessage.message_id);
      this.setLastBotMessage(chatId, sentMessage.message_id, true); // true = сообщение с фото
      return sentMessage;
    } catch (error) {
      console.error('Ошибка при отправке фото:', error);
      // Если не удалось отправить фото, отправляем обычное сообщение
      await this.sendMessage(chatId, caption, { reply_markup: keyboard });
    }
  }

  // Удаление предыдущих сообщений (кроме /start)
  private async deletePreviousMessages(chatId: number) {
    const messageIds = this.lastMessages.get(chatId) || [];
    
    for (const messageId of messageIds) {
      try {
        await this.bot?.deleteMessage(chatId, messageId);
      } catch (error) {
        // Игнорируем ошибки удаления (сообщение может быть уже удалено)
      }
    }
    
    // Очищаем список после удаления
    this.lastMessages.set(chatId, []);
  }

  // Сохранение ID сообщения для последующего удаления
  private addMessageToHistory(chatId: number, messageId: number) {
    const messageIds = this.lastMessages.get(chatId) || [];
    messageIds.push(messageId);
    this.lastMessages.set(chatId, messageIds);
  }

  // Сохранение ID последнего сообщения бота для редактирования
  private setLastBotMessage(chatId: number, messageId: number, hasPhoto: boolean = false) {
    this.lastBotMessage.set(chatId, { messageId, hasPhoto });
  }

  // Редактирование последнего сообщения бота
  private async editLastMessage(chatId: number, text: string, keyboard?: any) {
    const lastMessage = this.lastBotMessage.get(chatId);
    
    if (lastMessage && this.bot) {
      try {
        if (lastMessage.hasPhoto) {
          // Если последнее сообщение с фото, редактируем подпись
          await this.bot.editMessageCaption(text, {
            chat_id: chatId,
            message_id: lastMessage.messageId,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          });
        } else {
          // Если обычное текстовое сообщение
          await this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: lastMessage.messageId,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          });
        }
        return true;
      } catch (error) {
        console.error('Ошибка при редактировании сообщения:', error);
        return false;
      }
    }
    return false;
  }



  // Отправка текстового сообщения с умной заменой
  private async sendTextMessage(chatId: number, text: string, keyboard?: any) {
    const lastMessage = this.lastBotMessage.get(chatId);
    
    if (lastMessage?.hasPhoto) {
      // Если предыдущее было с фото, удаляем и отправляем новое текстовое
      await this.deletePreviousMessages(chatId);
      await this.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      // Пытаемся редактировать текстовое сообщение
      const edited = await this.editLastMessage(chatId, text, keyboard);
      if (!edited) {
        await this.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }
  }

  // Отправка сообщения с автоматическим сохранением ID
  private async sendMessage(chatId: number, text: string, options?: any) {
    if (!this.bot) return;

    try {
      const sentMessage = await this.bot.sendMessage(chatId, text, options);
      this.addMessageToHistory(chatId, sentMessage.message_id);
      this.setLastBotMessage(chatId, sentMessage.message_id, false); // false = текстовое сообщение
      return sentMessage;
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  }

  // Остановка бота
  public stop() {
    if (this.bot && this.isRunning) {
      this.bot.stopPolling();
      this.isRunning = false;
      console.log('🛑 Пользовательский Telegram бот остановлен');
    }
  }

  // Проверка статуса бота
  public isActive(): boolean {
    return this.isRunning;
  }
}

// Создание и экспорт экземпляра бота
export const userTelegramBot = new UserTelegramBot();
export default UserTelegramBot;
