import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';
import { getOrCreateQRCode } from '../lib/qr';

class UserTelegramBot {
  private bot: TelegramBot | null = null;
  private botToken: string | null = null;
  private isRunning = false;
  private lastMessages: Map<number, number[]> = new Map(); // chatId -> messageIds[]
  private lastBotMessage: Map<number, { messageId: number, hasPhoto: boolean }> = new Map(); // chatId -> lastBotMessage info
  private contactsPage: Map<number, number> = new Map(); // chatId -> currentContactIndex
  private productsPage: Map<number, number> = new Map(); // chatId -> currentProductIndex
  private productPhotoPage: Map<number, number> = new Map(); // chatId -> currentPhotoIndex
  private trainersPage: Map<number, number> = new Map(); // chatId -> currentTrainerIndex
  private trainerPhotoPage: Map<number, number> = new Map(); // chatId -> currentPhotoIndex
  private feedbackMode: Map<number, boolean> = new Map(); // chatId -> isInFeedbackMode
  private subscriptionsPage: Map<number, number> = new Map(); // chatId -> currentSubscriptionIndex

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
      if (process.env.NODE_ENV !== 'production') {
        console.log('🤖 Пользовательский Telegram бот запущен и готов к работе');
      }
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
      console.log('🔍 Поиск токена бота в базе данных...');
      
      const setting = await prisma.setting.findUnique({
        where: { key: 'admin_bot_token' }
      });

      if (!setting) {
        throw new Error('Настройка admin_bot_token не найдена в таблице Setting.');
      }

      if (!setting.value) {
        throw new Error('Значение токена бота пустое в настройках.');
      }

      console.log('✅ Токен бота найден в базе данных');
      this.botToken = setting.value;
      return this.botToken;
    } catch (error) {
      console.error('❌ Ошибка при получении токена пользовательского Telegram бота из БД:', error);
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

      if (process.env.NODE_ENV !== 'production') {
        console.log(`👤 Пользователь ${firstName} ${lastName} (@${username}) запустил бота. Telegram ID: ${telegramId}`);
      }

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
          case 'available_subscriptions':
            await this.handleAvailableSubscriptions(chatId);
            break;
          case 'subscriptions_prev':
            await this.handleSubscriptionsPrev(chatId);
            break;
          case 'subscriptions_next':
            await this.handleSubscriptionsNext(chatId);
            break;
          case 'qr_code':
            await this.handleQRCode(chatId, telegramId);
            break;
          case 'freeze_day':
            await this.handleFreezeDay(chatId, telegramId);
            break;
          case 'unfreeze_day':
            await this.handleUnfreezeDay(chatId, telegramId);
            break;
          case 'feedback':
            await this.handleFeedback(chatId, telegramId);
            break;
          case 'feedback_refresh':
            await this.handleFeedbackRefresh(chatId, telegramId);
            break;
          case 'contacts':
            await this.handleContacts(chatId);
            break;
          case 'contacts_prev':
            await this.handleContactsPrev(chatId);
            break;
          case 'contacts_next':
            await this.handleContactsNext(chatId);
            break;
          case 'products':
            await this.handleProducts(chatId);
            break;
          case 'products_prev':
            await this.handleProductsPrev(chatId);
            break;
          case 'products_next':
            await this.handleProductsNext(chatId);
            break;
          case 'product_photo_prev':
            await this.handleProductPhotoPrev(chatId);
            break;
          case 'product_photo_next':
            await this.handleProductPhotoNext(chatId);
            break;
          case 'trainers':
            await this.handleTrainers(chatId);
            break;
          case 'trainers_prev':
            await this.handleTrainersPrev(chatId);
            break;
          case 'trainers_next':
            await this.handleTrainersNext(chatId);
            break;
          case 'trainer_photo_prev':
            await this.handleTrainerPhotoPrev(chatId);
            break;
          case 'trainer_photo_next':
            await this.handleTrainerPhotoNext(chatId);
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
      const telegramId = msg.from?.id.toString();
      
      // Проверяем, находится ли пользователь в режиме отзыва
      if (this.feedbackMode.get(chatId)) {
        // Добавляем сообщение пользователя в историю для удаления
        this.addMessageToHistory(chatId, msg.message_id);
        await this.handleFeedbackMessage(chatId, telegramId!, msg.text!);
        return;
      }
      
      // Удаляем предыдущие сообщения при любом новом тексте (если не в режиме отзыва)
      await this.deletePreviousMessages(chatId);
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
    // Отключаем режим ввода отзыва при возврате в меню
    this.feedbackMode.delete(chatId);
    
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
          { text: '🛍️ Продукты', callback_data: 'products' },
          { text: '💪 Тренеры', callback_data: 'trainers' }
        ]
      ]
    };

    // Проверяем, есть ли приветственная картинка
    const imageUrl = await this.getWelcomeImageUrl();
    const lastMessage = this.lastBotMessage.get(chatId);
    
    if (imageUrl) {
      // Если есть картинка, главное меню должно быть с фото
      if (lastMessage?.hasPhoto) {
        // Редактируем медиа сообщение (меняем фото на приветственное + подпись + кнопки)
        const edited = await this.editLastMediaMessage(chatId, imageUrl, message, keyboard);
        if (!edited) {
          await this.deletePreviousMessages(chatId);
          await this.sendPhoto(chatId, imageUrl, message, keyboard);
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
          { text: '🛍️ Продукты', callback_data: 'products' },
          { text: '💪 Тренеры', callback_data: 'trainers' }
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
      const client: any = await prisma.client.findUnique({
        where: { telegramId: telegramId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            include: { 
              tariff: true,
              // @ts-ignore
              trainer: true,
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

        await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
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

      // Информация о тренере
      const trainerInfo = subscription.trainer 
        ? `💪 **Тренер:** ${subscription.trainer.name} (${subscription.trainer.price} ₽)`
        : '💪 **Тренер:** Без тренера';

      const message = `📝 Информация о вашем абонементе:

🏷️ **Название:** ${tariff.name}
💰 **Цена:** ${tariff.price} ₽
${trainerInfo}
📅 **Срок действия:** ${tariff.duration} мес. (до ${endDate})
🔢 **Количество посещений:** ${tariff.durationDays} дней
⏰ **Время доступа:** ${tariff.startTime} - ${tariff.endTime}
🧊 **Заморозки:** ${subscription.freezeUsed}/${tariff.freezeLimit} использовано

${remainingDays <= 7 ? '⚠️ Ваш абонемент скоро истекает! Не забудьте продлить.' : ''}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📜 История абонементов', callback_data: 'subscription_history' }],
          [{ text: '📋 Доступные абонементы', callback_data: 'available_subscriptions' }],
          [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
        ]
      };

      // Используем отправку/редактирование с приветственным фото
      await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении информации об абонементе:', error);
      const errorMessage = '❌ Ошибка при получении информации об абонементе.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };
      await this.sendOrEditWithWelcomePhoto(chatId, errorMessage, keyboard);
    }
  }

  // Обработка истории абонементов
  private async handleSubscriptionHistory(chatId: number, telegramId: string) {
    try {
      const client: any = await prisma.client.findUnique({
        where: { telegramId: telegramId },
        include: {
          subscriptions: {
            where: { status: { in: ['completed', 'active'] } },
            include: { 
              tariff: true,
              // @ts-ignore
              trainer: true
            },
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

        await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
        return;
      }

      let message = '📜 **История ваших абонементов:**\n\n';
      
      client.subscriptions.forEach((subscription: any, index: number) => {
        const tariff = subscription.tariff;
        const startDate = new Date(subscription.startDate).toLocaleDateString('ru-RU');
        const endDate = new Date(subscription.endDate).toLocaleDateString('ru-RU');
        const status = subscription.status === 'active' ? '🟢 Активный' : '⚪ Завершён';
        const trainerInfo = subscription.trainer ? `💪 ${subscription.trainer.name}` : '👨‍💪 Без тренера';
        
        message += `**${index + 1}. ${tariff.name}** ${status}\n`;
        message += `📅 ${startDate} - ${endDate}\n`;
        message += `💰 ${tariff.price} ₽\n`;
        message += `${trainerInfo}\n`;
        if (index < client.subscriptions.length - 1) {
          message += '\n';
        }
      });

      const keyboard = {
        inline_keyboard: [
          [{ text: '📜 Доступные абонементы', callback_data: 'available_subscriptions' }],
          [{ text: '🔙 К абонементу', callback_data: 'subscription' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };

      await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении истории абонементов:', error);
      const errorMessage = '❌ Ошибка при получении истории абонементов.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };
      await this.sendOrEditWithWelcomePhoto(chatId, errorMessage, keyboard);
    }
  }

  // Обработка QR-кода
  private async handleQRCode(chatId: number, telegramId: string) {
    try {
      // Ищем клиента по telegramId
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId }
      });

      if (!client) {
        const message = '❌ Вы не зарегистрированы в системе. Обратитесь к администратору.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, message, keyboard);
        }
        return;
      }

      // Проверяем, есть ли уже QR-код в БД
      const hasExistingQR = (client as any).qrCode && (client as any).qrCode !== 'qr';
      
      // Если QR-кода нет, показываем сообщение о генерации (редактируем текущее сообщение)
      if (!hasExistingQR) {
        const loadingMessage = '⏳ Генерируем ваш QR-код...';
        const loadingKeyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };
        
        const edited = await this.editLastMessage(chatId, loadingMessage, loadingKeyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, loadingMessage, loadingKeyboard);
        }
      }

      // Получаем или создаем QR-код
      const qrUrl = await getOrCreateQRCode(client.id);
      
      // Получаем информацию о заморозке для кнопок
      const freezeInfo = await this.getFreezeInfo(client.id);
      
      let message = `📱 Ваш QR-код для входа в фитнес-клуб`;
      
      // Добавляем информацию о заморозке
      if (freezeInfo.hasTodayFreeze) {
        message += `\n\n🧊 Сегодня у вас заморозка`;
      } else if (freezeInfo.canFreeze) {
        message += `\n\n🧊 Можно заморозить сегодня (${freezeInfo.freezeUsed}/${freezeInfo.freezeLimit})`;
      } else if (freezeInfo.freezeUsed >= freezeInfo.freezeLimit) {
        message += `\n\n⚠️ Лимит заморозок исчерпан (${freezeInfo.freezeUsed}/${freezeInfo.freezeLimit})`;
      }

      const keyboard: any = { inline_keyboard: [] };
      
      // Кнопки заморозки
      if (freezeInfo.hasTodayFreeze) {
        keyboard.inline_keyboard.push([
          { text: '🔥 Разморозить сегодня', callback_data: 'unfreeze_day' }
        ]);
      } else if (freezeInfo.canFreeze) {
        keyboard.inline_keyboard.push([
          { text: '🧊 Заморозить сегодня', callback_data: 'freeze_day' }
        ]);
      }
      
      // Кнопка назад
      keyboard.inline_keyboard.push([
        { text: '🔙 Назад в меню', callback_data: 'back_to_menu' }
      ]);

      // Редактируем сообщение, заменяя его на QR-код
      const edited = await this.editLastMediaMessage(chatId, qrUrl, message, keyboard);
      if (!edited) {
        // Если редактирование не удалось, отправляем новое сообщение
        await this.sendPhoto(chatId, qrUrl, message, keyboard);
      }

    } catch (error) {
      console.error('Ошибка при получении QR-кода:', error);
      
      const errorMessage = '❌ Ошибка при получении QR-кода. Попробуйте еще раз или обратитесь к администратору.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };

      // Пытаемся отредактировать последнее сообщение, если не получается - отправляем новое
      const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
      if (!edited) {
        await this.sendTextMessage(chatId, errorMessage, keyboard);
      }
    }
  }

  // Обработка отзывов и рекомендаций
  private async handleFeedback(chatId: number, telegramId: string) {
    try {
      // Получаем клиента по telegramId
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId }
      });

      if (!client) {
        const message = '❌ Клиент не найден.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };
        
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, message, keyboard);
        }
        return;
      }

      // Получаем последние 10 сообщений клиента (вопросы + ответы)
      const recentMessages = await this.getRecentFeedbackMessages(client.id);

      if (recentMessages.length === 0) {
        // Нет предыдущих сообщений - предлагаем написать отзыв
        const message = `💬 **Отзывы и рекомендации**

Мы ценим ваше мнение! Поделитесь своими впечатлениями о нашем фитнес-центре или оставьте рекомендации для улучшения наших услуг.

📝 Напишите ваше сообщение, и мы обязательно ответим!`;

        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        // Включаем режим ввода отзыва
        this.feedbackMode.set(chatId, true);
        
        // Используем редактирование сообщения вместо отправки нового
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, message, keyboard);
        }
      } else {
        // Показываем историю сообщений
        await this.showFeedbackHistory(chatId, recentMessages);
      }
    } catch (error) {
      console.error('Ошибка при обработке отзывов:', error);
      const errorMessage = '❌ Ошибка при получении отзывов.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };
      
      const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
      if (!edited) {
        await this.sendTextMessage(chatId, errorMessage, keyboard);
      }
    }
  }

  // Получение последних сообщений отзывов клиента
  private async getRecentFeedbackMessages(clientId: number) {
    try {
      // Упрощенный запрос - получаем все сообщения клиента и ответы на них
      const messages = await prisma.$queryRaw<Array<{
        id: number;
        client_id: number | null;
        parent_id: number | null;
        sender_role: string;
        message: string;
        created_at: Date;
      }>>`
        SELECT 
          f.id, 
          f.client_id, 
          f.parent_id, 
          f.sender_role, 
          f.message, 
          f.created_at
        FROM feedback f
        WHERE 
          f.client_id = ${clientId}
          OR (
            f.sender_role = 'admin' 
            AND f.parent_id IN (
              SELECT id FROM feedback 
              WHERE client_id = ${clientId} AND sender_role = 'user'
            )
          )
        ORDER BY f.created_at ASC
        LIMIT 20
      `;

      return messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        senderRole: msg.sender_role,
        createdAt: msg.created_at,
        isReply: !!msg.parent_id,
        parentId: msg.parent_id
      }));
    } catch (error) {
      console.error('Ошибка при получении сообщений отзывов:', error);
      return [];
    }
  }

  // Показать историю отзывов
  private async showFeedbackHistory(chatId: number, messages: any[]) {
    let historyText = `💬 **История ваших обращений**\n\n`;

    // Сортируем все сообщения по времени создания
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Берем последние 10 сообщений
    const recentMessages = sortedMessages.slice(-10);

    // Отображаем сообщения в хронологическом порядке
    recentMessages.forEach(msg => {
      if (msg.senderRole === 'user') {
        historyText += `🏋️: "${msg.message}"\n`;
      } else {
        historyText += `👤: "${msg.message}"\n`;
      }
    });

    // Проверяем, есть ли непрочитанные сообщения пользователя
    const lastMessage = recentMessages[recentMessages.length - 1];
    const hasUnreadUserMessages = recentMessages.some(msg => {
      if (msg.senderRole === 'user') {
        // Проверяем, есть ли ответ админа после этого сообщения
        const hasAdminReply = recentMessages.some(adminMsg => 
          adminMsg.senderRole === 'admin' && 
          new Date(adminMsg.createdAt) > new Date(msg.createdAt)
        );
        return !hasAdminReply;
      }
      return false;
    });

    if (hasUnreadUserMessages) {
      historyText += `\n⏳ Ждите ответа...\n`;
    }

    historyText += `\n📝 Чтобы оставить новый отзыв, просто напишите сообщение.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Обновить', callback_data: 'feedback_refresh' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };

    // Включаем режим ввода нового отзыва
    this.feedbackMode.set(chatId, true);
    
    // Используем редактирование сообщения вместо отправки нового
    const edited = await this.editLastMessage(chatId, historyText, keyboard);
    if (!edited) {
      await this.sendTextMessage(chatId, historyText, keyboard);
    }
  }

  // Показать историю отзывов с подтверждением отправки
  private async showFeedbackHistoryWithConfirmation(chatId: number, messages: any[], lastMessage: string) {
    let historyText = `✅ **Сообщение отправлено!**\n\n`;
    historyText += `💬 **История ваших обращений**\n\n`;

    // Сортируем все сообщения по времени создания
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Берем последние 10 сообщений
    const recentMessages = sortedMessages.slice(-10);

    // Отображаем сообщения в хронологическом порядке
    recentMessages.forEach(msg => {
      if (msg.senderRole === 'user') {
        historyText += `🏋️: "${msg.message}"\n`;
      } else {
        historyText += `👤: "${msg.message}"\n`;
      }
    });

    // Проверяем, есть ли непрочитанные сообщения пользователя
    const hasUnreadUserMessages = recentMessages.some(msg => {
      if (msg.senderRole === 'user') {
        // Проверяем, есть ли ответ админа после этого сообщения
        const hasAdminReply = recentMessages.some(adminMsg => 
          adminMsg.senderRole === 'admin' && 
          new Date(adminMsg.createdAt) > new Date(msg.createdAt)
        );
        return !hasAdminReply;
      }
      return false;
    });

    if (hasUnreadUserMessages) {
      historyText += `\n⏳ Ждите ответа...\n`;
    }

    historyText += `\n📝 **Напишите еще одно сообщение** или вернитесь в меню.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Обновить', callback_data: 'feedback_refresh' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };

    // Режим ввода остается активным
    await this.sendMessage(chatId, historyText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Обработка обновления отзывов
  private async handleFeedbackRefresh(chatId: number, telegramId: string) {
    try {
      // Получаем клиента по telegramId
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId }
      });

      if (!client) {
        const message = '❌ Клиент не найден.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };
        
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, message, keyboard);
        }
        return;
      }

      // Получаем свежие сообщения из базы данных
      const recentMessages = await this.getRecentFeedbackMessages(client.id);

      if (recentMessages.length === 0) {
        // Нет сообщений - показываем приглашение написать отзыв
        const message = `💬 **Отзывы и рекомендации**

Мы ценим ваше мнение! Поделитесь своими впечатлениями о нашем фитнес-центре или оставьте рекомендации для улучшения наших услуг.

📝 Напишите ваше сообщение, и мы обязательно ответим!`;

        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        // Включаем режим ввода отзыва
        this.feedbackMode.set(chatId, true);
        
        const edited = await this.editLastMessage(chatId, message, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, message, keyboard);
        }
      } else {
        // Показываем обновленную историю сообщений
        await this.showFeedbackHistory(chatId, recentMessages);
      }
    } catch (error) {
      console.error('Ошибка при обновлении отзывов:', error);
      const errorMessage = '❌ Ошибка при обновлении отзывов.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };
      
      const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
      if (!edited) {
        await this.sendTextMessage(chatId, errorMessage, keyboard);
      }
    }
  }

  // Обработка нового сообщения отзыва
  private async handleFeedbackMessage(chatId: number, telegramId: string, message: string) {
    try {
      // Получаем клиента
      const client = await prisma.client.findUnique({
        where: { telegramId: telegramId }
      });

      if (!client) {
        await this.sendTextMessage(chatId, '❌ Клиент не найден.');
        this.feedbackMode.delete(chatId);
        return;
      }

      // Находим последнее сообщение админа для этого клиента
      const lastAdminMessage = await prisma.feedback.findFirst({
        where: {
          clientId: client.id,
          senderRole: 'admin'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Сохраняем сообщение в базу данных с правильным parent_id
      await prisma.feedback.create({
        data: {
          clientId: client.id,
          senderRole: 'user',
          message: message.trim(),
          parentId: lastAdminMessage?.id || null // Связываем с последним сообщением админа
        }
      });

      // Удаляем сообщение пользователя и предыдущие сообщения
      await this.deletePreviousMessages(chatId);

      // НЕ отключаем режим ввода отзыва - пользователь может писать дальше
      // this.feedbackMode.delete(chatId); // Оставляем включенным!

      // Получаем обновленную историю после добавления нового сообщения
      const updatedMessages = await this.getRecentFeedbackMessages(client.id);
      
      // Показываем обновленную историю с подтверждением
      await this.showFeedbackHistoryWithConfirmation(chatId, updatedMessages, message);
    } catch (error) {
      console.error('Ошибка при сохранении отзыва:', error);
      await this.sendTextMessage(chatId, '❌ Ошибка при отправке сообщения. Попробуйте еще раз.');
      this.feedbackMode.delete(chatId);
    }
  }

  // Обработка контактов
  private async handleContacts(chatId: number) {
    // Сбрасываем индекс при первом открытии
    this.contactsPage.set(chatId, 0);
    await this.showContacts(chatId);
  }

  // Показать контакты с пагинацией
  private async showContacts(chatId: number) {
    try {
      const contacts = await prisma.contact.findMany({
        orderBy: { id: 'asc' }
      });

      if (!contacts || contacts.length === 0) {
        const message = '❌ Контактная информация не найдена.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
        return;
      }

      const currentIndex = this.contactsPage.get(chatId) || 0;
      const contact = contacts[currentIndex];
      const totalContacts = contacts.length;

      const socialLinks = contact.socialLinks as any;
      let socialText = '';
      
      if (socialLinks) {
        if (socialLinks.instagram) socialText += `📸 [Instagram](${socialLinks.instagram})\n`;
        if (socialLinks.vk) socialText += `🔵 [ВКонтакте](${socialLinks.vk})\n`;
        if (socialLinks.telegram) socialText += `📱 [Telegram](${socialLinks.telegram})\n`;
      }

      let message = '';
      
      if (totalContacts > 1) {
        message = `📞 **Контакты фитнес-клуба** (${currentIndex + 1}/${totalContacts})

📱 **Телефон:** ${contact.phone}
📍 **Адрес:** ${contact.address}

${socialText}`;
      } else {
        message = `📞 **Контакты фитнес-клуба**

📱 **Телефон:** ${contact.phone}
📍 **Адрес:** ${contact.address}

${socialText}`;
      }

      if (contact.mapLink) {
        message += `\n🗺️ [Посмотреть на карте](${contact.mapLink})`;
      }

      // Создаем клавиатуру с навигацией
      const keyboard: any = { inline_keyboard: [] };

      // Кнопки навигации (только если контактов больше одного)
      if (totalContacts > 1) {
        const navButtons = [];
        if (currentIndex > 0) {
          navButtons.push({ text: '⬅️ Предыдущий филиал', callback_data: 'contacts_prev' });
        }
        if (currentIndex < totalContacts - 1) {
          navButtons.push({ text: 'Следующий филиал ➡️', callback_data: 'contacts_next' });
        }
        if (navButtons.length > 0) {
          keyboard.inline_keyboard.push(navButtons);
        }
      }

      // Кнопка "Назад в меню"
      keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);

      await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении контактов:', error);
      const errorMessage = '❌ Ошибка при получении контактной информации.';
      const keyboard = {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      };
      await this.sendOrEditWithWelcomePhoto(chatId, errorMessage, keyboard);
    }
  }

  // Предыдущий контакт
  private async handleContactsPrev(chatId: number) {
    const currentIndex = this.contactsPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.contactsPage.set(chatId, currentIndex - 1);
      await this.showContacts(chatId);
    }
  }

  // Следующий контакт
  private async handleContactsNext(chatId: number) {
    const contacts = await prisma.contact.findMany();
    const currentIndex = this.contactsPage.get(chatId) || 0;
    
    if (currentIndex < contacts.length - 1) {
      this.contactsPage.set(chatId, currentIndex + 1);
      await this.showContacts(chatId);
    }
  }

  // Обработка продуктов
  private async handleProducts(chatId: number) {
    // Сбрасываем индексы при первом открытии
    this.productsPage.set(chatId, 0);
    this.productPhotoPage.set(chatId, 0);
    await this.showProducts(chatId);
  }

  // Показать продукты с пагинацией
  private async showProducts(chatId: number) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });

      if (!products || products.length === 0) {
        const message = '❌ Продукты не найдены.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      const currentProductIndex = this.productsPage.get(chatId) || 0;
      const currentPhotoIndex = this.productPhotoPage.get(chatId) || 0;
      const product = products[currentProductIndex];
      const totalProducts = products.length;

      // Извлекаем URL изображений
      const imageUrls = this.extractImageUrls(product.photoUrl);
      const totalPhotos = imageUrls.length;
      const hasPhotos = totalPhotos > 0;

      // Формируем подпись к товару
      let caption = `🛍️ **${product.name}**`;
      
      if (totalProducts > 1) {
        caption += ` (${currentProductIndex + 1}/${totalProducts})`;
      }
      
      if (hasPhotos && totalPhotos > 1) {
        caption += `\n📸 Фото ${currentPhotoIndex + 1}/${totalPhotos}`;
      }

      caption += `\n\n💰 **Цена:** ${product.price} ₽\n\n📝 ${product.description}`;

      // Создаем клавиатуру с навигацией
      const keyboard: any = { inline_keyboard: [] };

      // Кнопки навигации по фото (если фото больше одного)
      if (hasPhotos && totalPhotos > 1) {
        const photoButtons = [];
        if (currentPhotoIndex > 0) {
          photoButtons.push({ text: '⬅️ Фото', callback_data: 'product_photo_prev' });
        }
        if (currentPhotoIndex < totalPhotos - 1) {
          photoButtons.push({ text: 'Фото ➡️', callback_data: 'product_photo_next' });
        }
        if (photoButtons.length > 0) {
          keyboard.inline_keyboard.push(photoButtons);
        }
      }

      // Кнопки навигации по товарам (если товаров больше одного)
      if (totalProducts > 1) {
        const productButtons = [];
        if (currentProductIndex > 0) {
          productButtons.push({ text: '⬅️ Товар', callback_data: 'products_prev' });
        }
        if (currentProductIndex < totalProducts - 1) {
          productButtons.push({ text: 'Товар ➡️', callback_data: 'products_next' });
        }
        if (productButtons.length > 0) {
          keyboard.inline_keyboard.push(productButtons);
        }
      }

      // Кнопка "Назад в меню"
      keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);

      // Отправляем или редактируем сообщение
      if (hasPhotos) {
        const currentPhotoUrl = imageUrls[currentPhotoIndex];
        const lastMessage = this.lastBotMessage.get(chatId);
        
        if (lastMessage?.hasPhoto) {
          // Редактируем существующее фото
          const edited = await this.editLastMediaMessage(chatId, currentPhotoUrl, caption, keyboard);
          if (!edited) {
            await this.deletePreviousMessages(chatId);
            await this.sendPhoto(chatId, currentPhotoUrl, caption, keyboard);
          }
        } else {
          // Предыдущее было текстовым, отправляем новое фото
          await this.deletePreviousMessages(chatId);
          await this.sendPhoto(chatId, currentPhotoUrl, caption, keyboard);
        }
      } else {
        // Товар без фото - отправляем текстовое сообщение
        await this.sendTextMessage(chatId, caption, keyboard);
      }
    } catch (error) {
      console.error('Ошибка при получении продуктов:', error);
      const errorMessage = '❌ Ошибка при получении списка продуктов.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Предыдущий товар
  private async handleProductsPrev(chatId: number) {
    const currentIndex = this.productsPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.productsPage.set(chatId, currentIndex - 1);
      this.productPhotoPage.set(chatId, 0); // Сбрасываем фото на первое
      await this.showProducts(chatId);
    }
  }

  // Следующий товар
  private async handleProductsNext(chatId: number) {
    const products = await prisma.product.findMany();
    const currentIndex = this.productsPage.get(chatId) || 0;
    
    if (currentIndex < products.length - 1) {
      this.productsPage.set(chatId, currentIndex + 1);
      this.productPhotoPage.set(chatId, 0); // Сбрасываем фото на первое
      await this.showProducts(chatId);
    }
  }

  // Предыдущее фото товара
  private async handleProductPhotoPrev(chatId: number) {
    const currentIndex = this.productPhotoPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.productPhotoPage.set(chatId, currentIndex - 1);
      await this.showProducts(chatId);
    }
  }

  // Следующее фото товара
  private async handleProductPhotoNext(chatId: number) {
    try {
      const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
      const currentProductIndex = this.productsPage.get(chatId) || 0;
      const product = products[currentProductIndex];
      
      if (product) {
        const imageUrls = this.extractImageUrls(product.photoUrl);
        const currentPhotoIndex = this.productPhotoPage.get(chatId) || 0;
        
        if (currentPhotoIndex < imageUrls.length - 1) {
          this.productPhotoPage.set(chatId, currentPhotoIndex + 1);
          await this.showProducts(chatId);
        }
      }
    } catch (error) {
      console.error('Ошибка при переключении фото:', error);
    }
  }

  // Обработка тренеров
  private async handleTrainers(chatId: number) {
    // Сбрасываем индексы при первом открытии
    this.trainersPage.set(chatId, 0);
    this.trainerPhotoPage.set(chatId, 0);
    await this.showTrainers(chatId);
  }

  // Показать тренеров с пагинацией
  private async showTrainers(chatId: number) {
    try {
      const trainers = await prisma.trainer.findMany({
        orderBy: { createdAt: 'desc' }
      });

      if (!trainers || trainers.length === 0) {
        const message = '❌ Тренеры не найдены.';
        const keyboard = {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        };

        await this.sendTextMessage(chatId, message, keyboard);
        return;
      }

      const currentTrainerIndex = this.trainersPage.get(chatId) || 0;
      const currentPhotoIndex = this.trainerPhotoPage.get(chatId) || 0;
      const trainer = trainers[currentTrainerIndex];
      const totalTrainers = trainers.length;

      // Извлекаем URL изображений
      const imageUrls = this.extractImageUrls(trainer.photoUrl);
      const totalPhotos = imageUrls.length;
      const hasPhotos = totalPhotos > 0;

      // Формируем подпись к тренеру
      let caption = `💪 **${trainer.name}**`;
      
      if (totalTrainers > 1) {
        caption += ` (${currentTrainerIndex + 1}/${totalTrainers})`;
      }
      
      if (hasPhotos && totalPhotos > 1) {
        caption += `\n📸 Фото ${currentPhotoIndex + 1}/${totalPhotos}`;
      }

      caption += `\n\n💰 **Цена за тренировку:** ${trainer.price} ₽\n\n📝 ${trainer.description}`;

      // Создаем клавиатуру с навигацией
      const keyboard: any = { inline_keyboard: [] };

      // Кнопки навигации по фото (если фото больше одного)
      if (hasPhotos && totalPhotos > 1) {
        const photoButtons = [];
        if (currentPhotoIndex > 0) {
          photoButtons.push({ text: '⬅️ Фото', callback_data: 'trainer_photo_prev' });
        }
        if (currentPhotoIndex < totalPhotos - 1) {
          photoButtons.push({ text: 'Фото ➡️', callback_data: 'trainer_photo_next' });
        }
        if (photoButtons.length > 0) {
          keyboard.inline_keyboard.push(photoButtons);
        }
      }

      // Кнопки навигации по тренерам (если тренеров больше одного)
      if (totalTrainers > 1) {
        const trainerButtons = [];
        if (currentTrainerIndex > 0) {
          trainerButtons.push({ text: '⬅️ Тренер', callback_data: 'trainers_prev' });
        }
        if (currentTrainerIndex < totalTrainers - 1) {
          trainerButtons.push({ text: 'Тренер ➡️', callback_data: 'trainers_next' });
        }
        if (trainerButtons.length > 0) {
          keyboard.inline_keyboard.push(trainerButtons);
        }
      }

      // Кнопка "Назад в меню"
      keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);

      // Отправляем или редактируем сообщение
      if (hasPhotos) {
        const currentPhotoUrl = imageUrls[currentPhotoIndex];
        const lastMessage = this.lastBotMessage.get(chatId);
        
        if (lastMessage?.hasPhoto) {
          // Редактируем существующее фото
          const edited = await this.editLastMediaMessage(chatId, currentPhotoUrl, caption, keyboard);
          if (!edited) {
            await this.deletePreviousMessages(chatId);
            await this.sendPhoto(chatId, currentPhotoUrl, caption, keyboard);
          }
        } else {
          // Предыдущее было текстовым, отправляем новое фото
          await this.deletePreviousMessages(chatId);
          await this.sendPhoto(chatId, currentPhotoUrl, caption, keyboard);
        }
      } else {
        // Тренер без фото - отправляем текстовое сообщение
        await this.sendTextMessage(chatId, caption, keyboard);
      }
    } catch (error) {
      console.error('Ошибка при получении тренеров:', error);
      const errorMessage = '❌ Ошибка при получении списка тренеров.';
      const edited = await this.editLastMessage(chatId, errorMessage);
      if (!edited) {
        await this.sendMessage(chatId, errorMessage);
      }
    }
  }

  // Предыдущий тренер
  private async handleTrainersPrev(chatId: number) {
    const currentIndex = this.trainersPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.trainersPage.set(chatId, currentIndex - 1);
      this.trainerPhotoPage.set(chatId, 0); // Сбрасываем фото на первое
      await this.showTrainers(chatId);
    }
  }

  // Следующий тренер
  private async handleTrainersNext(chatId: number) {
    const trainers = await prisma.trainer.findMany();
    const currentIndex = this.trainersPage.get(chatId) || 0;
    
    if (currentIndex < trainers.length - 1) {
      this.trainersPage.set(chatId, currentIndex + 1);
      this.trainerPhotoPage.set(chatId, 0); // Сбрасываем фото на первое
      await this.showTrainers(chatId);
    }
  }

  // Предыдущее фото тренера
  private async handleTrainerPhotoPrev(chatId: number) {
    const currentIndex = this.trainerPhotoPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.trainerPhotoPage.set(chatId, currentIndex - 1);
      await this.showTrainers(chatId);
    }
  }

  // Следующее фото тренера
  private async handleTrainerPhotoNext(chatId: number) {
    try {
      const trainers = await prisma.trainer.findMany({ orderBy: { createdAt: 'desc' } });
      const currentTrainerIndex = this.trainersPage.get(chatId) || 0;
      const trainer = trainers[currentTrainerIndex];
      
      if (trainer) {
        const imageUrls = this.extractImageUrls(trainer.photoUrl);
        const currentPhotoIndex = this.trainerPhotoPage.get(chatId) || 0;
        
        if (currentPhotoIndex < imageUrls.length - 1) {
          this.trainerPhotoPage.set(chatId, currentPhotoIndex + 1);
          await this.showTrainers(chatId);
        }
      }
    } catch (error) {
      console.error('Ошибка при переключении фото тренера:', error);
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

  // Получение информации о возможностях заморозки
  private async getFreezeInfo(clientId: number) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            include: { tariff: true },
            orderBy: { endDate: 'desc' }
          }
        }
      });

      if (!client || !client.subscriptions[0]) {
        return { canFreeze: false, hasTodayFreeze: false, freezeUsed: 0, freezeLimit: 0 };
      }

      const activeSubscription = client.subscriptions[0];
      
      // Проверяем, есть ли заморозка на сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayFreeze = await prisma.visit.findFirst({
        where: {
          clientId: clientId,
          subscriptionId: activeSubscription.id,
          visitDate: {
            gte: today,
            lt: tomorrow
          },
          isFreezeDay: true
        }
      });

      const canFreeze = activeSubscription.freezeUsed < activeSubscription.tariff.freezeLimit && !todayFreeze;
      
      return {
        canFreeze,
        hasTodayFreeze: !!todayFreeze,
        freezeUsed: activeSubscription.freezeUsed,
        freezeLimit: activeSubscription.tariff.freezeLimit,
        todayFreezeId: todayFreeze?.id
      };
    } catch (error) {
      console.error('Ошибка при получении информации о заморозке:', error);
      return { canFreeze: false, hasTodayFreeze: false, freezeUsed: 0, freezeLimit: 0 };
    }
  }

  // Обработка заморозки дня
  private async handleFreezeDay(chatId: number, telegramId: string) {
    try {
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://app:3000'}/api/visits`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramId,
          action: 'freeze'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Обновляем QR-меню с новой информацией
        await this.handleQRCode(chatId, telegramId);
      } else {
        const errorMessage = `❌ ${result.error || 'Ошибка при заморозке'}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Назад к QR-коду', callback_data: 'qr_code' }],
            [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
          ]
        };
        
        const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, errorMessage, keyboard);
        }
      }
    } catch (error) {
      console.error('Ошибка при заморозке дня:', error);
      const errorMessage = '❌ Ошибка при заморозке дня';
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔙 Назад к QR-коду', callback_data: 'qr_code' }]
        ]
      };
      
      const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
      if (!edited) {
        await this.sendTextMessage(chatId, errorMessage, keyboard);
      }
    }
  }

  // Обработка разморозки дня
  private async handleUnfreezeDay(chatId: number, telegramId: string) {
    try {
      const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://app:3000'}/api/visits`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramId,
          action: 'unfreeze'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Обновляем QR-меню с новой информацией
        await this.handleQRCode(chatId, telegramId);
      } else {
        const errorMessage = `❌ ${result.error || 'Ошибка при разморозке'}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Назад к QR-коду', callback_data: 'qr_code' }],
            [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
          ]
        };
        
        const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
        if (!edited) {
          await this.sendTextMessage(chatId, errorMessage, keyboard);
        }
      }
    } catch (error) {
      console.error('Ошибка при разморозке дня:', error);
      const errorMessage = '❌ Ошибка при разморозке дня';
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔙 Назад к QR-коду', callback_data: 'qr_code' }]
        ]
      };
      
      const edited = await this.editLastMessage(chatId, errorMessage, keyboard);
      if (!edited) {
        await this.sendTextMessage(chatId, errorMessage, keyboard);
      }
    }
  }

  // Обработка доступных абонементов
  private async handleAvailableSubscriptions(chatId: number) {
    // Сбрасываем индекс при первом открытии
    this.subscriptionsPage.set(chatId, 0);
    await this.showAvailableSubscriptions(chatId);
  }

  // Показать доступные абонементы с пагинацией
  private async showAvailableSubscriptions(chatId: number) {
    try {
      const tariffs = await prisma.tariff.findMany({
        orderBy: { price: 'asc' }
      });

      if (!tariffs || tariffs.length === 0) {
        const message = '❌ Доступные абонементы не найдены.';
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 К истории', callback_data: 'subscription_history' }],
            [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
          ]
        };

        await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
        return;
      }

      const currentIndex = this.subscriptionsPage.get(chatId) || 0;
      const tariff = tariffs[currentIndex];
      const totalTariffs = tariffs.length;

      let message = `📜 **Доступные абонементы**`;
      
      if (totalTariffs > 1) {
        message += ` (${currentIndex + 1}/${totalTariffs})`;
      }
      
      message += `\n\n🏷️ **Название:** ${tariff.name}`;
      message += `\n💰 **Цена:** ${tariff.price} ₽`;
      message += `\n📅 **Срок действия:** ${tariff.duration} мес.`;
      message += `\n🔢 **Количество посещений:** ${tariff.durationDays} дней`;
      message += `\n⏰ **Время доступа:** ${tariff.startTime} - ${tariff.endTime}`;
      message += `\n🧊 **Заморозки:** ${tariff.freezeLimit} дней`;
      
      // Описание не предусмотрено в модели
      if (false) {
        // Описание не предусмотрено в модели
      }

      // Создаем клавиатуру с навигацией
      const keyboard: any = { inline_keyboard: [] };

      // Кнопки навигации (только если абонементов больше одного)
      if (totalTariffs > 1) {
        const navButtons = [];
        if (currentIndex > 0) {
          navButtons.push({ text: '⬅️ Предыдущий', callback_data: 'subscriptions_prev' });
        }
        if (currentIndex < totalTariffs - 1) {
          navButtons.push({ text: 'Следующий ➡️', callback_data: 'subscriptions_next' });
        }
        if (navButtons.length > 0) {
          keyboard.inline_keyboard.push(navButtons);
        }
      }

      // Кнопки навигации
      keyboard.inline_keyboard.push([
        { text: '🔙 К истории', callback_data: 'subscription_history' },
        { text: '🏠 Главное меню', callback_data: 'back_to_menu' }
      ]);

      await this.sendOrEditWithWelcomePhoto(chatId, message, keyboard);
    } catch (error) {
      console.error('Ошибка при получении доступных абонементов:', error);
      const errorMessage = '❌ Ошибка при получении списка абонементов.';
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔙 К истории', callback_data: 'subscription_history' }],
          [{ text: '🏠 Главное меню', callback_data: 'back_to_menu' }]
        ]
      };
      await this.sendOrEditWithWelcomePhoto(chatId, errorMessage, keyboard);
    }
  }

  // Предыдущий абонемент
  private async handleSubscriptionsPrev(chatId: number) {
    const currentIndex = this.subscriptionsPage.get(chatId) || 0;
    if (currentIndex > 0) {
      this.subscriptionsPage.set(chatId, currentIndex - 1);
      await this.showAvailableSubscriptions(chatId);
    }
  }

  // Следующий абонемент
  private async handleSubscriptionsNext(chatId: number) {
    const tariffs = await prisma.tariff.findMany();
    const currentIndex = this.subscriptionsPage.get(chatId) || 0;
    
    if (currentIndex < tariffs.length - 1) {
      this.subscriptionsPage.set(chatId, currentIndex + 1);
      await this.showAvailableSubscriptions(chatId);
    }
  }

  // Отправка или редактирование сообщения с фото из главного меню
  private async sendOrEditWithWelcomePhoto(chatId: number, message: string, keyboard: any) {
    const imageUrl = await this.getWelcomeImageUrl();
    
    if (imageUrl) {
      // Пытаемся отредактировать существующее сообщение
      const edited = await this.editLastMediaMessage(chatId, imageUrl, message, keyboard);
      if (!edited) {
        // Если редактирование не удалось, отправляем новое с фото
        await this.sendPhoto(chatId, imageUrl, message, keyboard);
      }
    } else {
      // Если фото нет, пытаемся отредактировать как текст
      const edited = await this.editLastMessage(chatId, message, keyboard);
      if (!edited) {
        // Если редактирование не удалось, отправляем новое текстовое
        await this.sendTextMessage(chatId, message, keyboard);
      }
    }
  }

  // Извлечение URL изображений из JSON строки
  private extractImageUrls(photoUrl: string | null): string[] {
    if (!photoUrl) return [];
    
    try {
      // Пытаемся распарсить как JSON
      const urls = JSON.parse(photoUrl);
      return Array.isArray(urls) ? urls : [photoUrl];
    } catch (e) {
      // Если не JSON, значит это одиночный URL
      return [photoUrl];
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
    // Очищаем информацию о последнем сообщении бота
    this.lastBotMessage.delete(chatId);
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

  // Редактирование медиа сообщения (фото, подпись, клавиатура)
  private async editLastMediaMessage(chatId: number, photoUrl: string, caption: string, keyboard?: any) {
    const lastMessage = this.lastBotMessage.get(chatId);
    
    if (lastMessage && this.bot) {
      try {
        // Редактируем медиа (фото)
        await this.bot.editMessageMedia({
          type: 'photo',
          media: photoUrl,
          caption: caption,
          parse_mode: 'Markdown'
        }, {
          chat_id: chatId,
          message_id: lastMessage.messageId,
          reply_markup: keyboard
        });
        return true;
      } catch (error) {
        console.error('Ошибка при редактировании медиа сообщения:', error);
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
    } else if (lastMessage) {
      // Пытаемся редактировать текстовое сообщение
      const edited = await this.editLastMessage(chatId, text, keyboard);
      if (!edited) {
        // Если редактирование не удалось, отправляем новое
        await this.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } else {
      // Нет предыдущего сообщения - отправляем новое
      await this.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('🛑 Пользовательский Telegram бот остановлен');
      }
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