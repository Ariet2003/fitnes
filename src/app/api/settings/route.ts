import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['admin', 'admin_telegram', 'admin_bot_token', 'welcome_image_url']
        }
      }
    });

    // Форматируем данные для клиента
    const formattedSettings: Record<string, any> = {};
    
    settings.forEach(setting => {
      if (setting.key === 'admin') {
        try {
          const adminData = JSON.parse(setting.value);
          formattedSettings.adminLogin = adminData.login;
          // Не отправляем пароль на клиент
        } catch (error) {
          console.error('Ошибка парсинга данных админа:', error);
        }
      } else if (setting.key === 'admin_telegram') {
        formattedSettings.adminTelegram = setting.value;
      } else if (setting.key === 'admin_bot_token') {
        formattedSettings.adminBotToken = setting.value;
      } else if (setting.key === 'welcome_image_url') {
        formattedSettings.welcomeImageUrl = setting.value;
      }
    });

    return NextResponse.json(formattedSettings);
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { adminLogin, adminPassword, adminTelegram, adminBotToken, welcomeImageUrl } = data;

    // Валидация данных
    if (!adminLogin || !adminTelegram || !adminBotToken) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Проверяем формат Telegram ID (должен быть числом)
    if (!/^\d+$/.test(adminTelegram)) {
      return NextResponse.json(
        { error: 'Telegram ID должен содержать только цифры' },
        { status: 400 }
      );
    }

    // Проверяем формат Bot Token
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(adminBotToken)) {
      return NextResponse.json(
        { error: 'Неверный формат Bot Token' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Обновляем данные администратора
      const currentAdminSetting = await tx.setting.findUnique({
        where: { key: 'admin' }
      });

      let adminData: any = { login: adminLogin };
      
      if (adminPassword) {
        // Если предоставлен новый пароль, хешируем его
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        adminData.password = hashedPassword;
      } else if (currentAdminSetting) {
        // Если пароль не предоставлен, сохраняем текущий
        try {
          const currentData = JSON.parse(currentAdminSetting.value);
          adminData.password = currentData.password;
        } catch (error) {
          throw new Error('Не удалось получить текущий пароль');
        }
      } else {
        throw new Error('Пароль обязателен для создания нового администратора');
      }

      // Обновляем настройки администратора
      await tx.setting.upsert({
        where: { key: 'admin' },
        update: {
          value: JSON.stringify(adminData),
          updatedAt: new Date()
        },
        create: {
          key: 'admin',
          value: JSON.stringify(adminData)
        }
      });

      // Обновляем Telegram ID
      await tx.setting.upsert({
        where: { key: 'admin_telegram' },
        update: {
          value: adminTelegram,
          updatedAt: new Date()
        },
        create: {
          key: 'admin_telegram',
          value: adminTelegram
        }
      });

      // Обновляем Bot Token
      await tx.setting.upsert({
        where: { key: 'admin_bot_token' },
        update: {
          value: adminBotToken,
          updatedAt: new Date()
        },
        create: {
          key: 'admin_bot_token',
          value: adminBotToken
        }
      });

      // Обновляем URL приветственного изображения, если передан
      if (welcomeImageUrl !== undefined) {
        if (welcomeImageUrl) {
          await tx.setting.upsert({
            where: { key: 'welcome_image_url' },
            update: {
              value: welcomeImageUrl,
              updatedAt: new Date()
            },
            create: {
              key: 'welcome_image_url',
              value: welcomeImageUrl
            }
          });
        } else {
          // Если передана пустая строка, удаляем настройку
          await tx.setting.deleteMany({
            where: { key: 'welcome_image_url' }
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Настройки успешно обновлены' });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка обновления настроек' },
      { status: 500 }
    );
  }
}




