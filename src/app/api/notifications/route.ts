import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { telegramService } from '@/lib/telegram';

// GET - получить все рассылки
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count()
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении рассылок:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении рассылок' },
      { status: 500 }
    );
  }
}

// POST - создать и отправить рассылку
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, photoUrl, filterType, filterParams } = body;

    // Проверяем обязательные поля
    if (!title || !message || !filterType) {
      return NextResponse.json(
        { error: 'Заголовок, сообщение и тип фильтра обязательны' },
        { status: 400 }
      );
    }

    // Получаем клиентов по фильтру
    const clients = await getFilteredClients(filterType, filterParams);

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено клиентов для рассылки' },
        { status: 400 }
      );
    }

    // Фильтруем только клиентов с Telegram ID
    const telegramClients = clients.filter(client => client.telegramId);

    if (telegramClients.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено клиентов с Telegram ID для рассылки' },
        { status: 400 }
      );
    }

    // Создаем запись о рассылке
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        photoUrl,
        filterType: JSON.stringify({ type: filterType, params: filterParams }),
        sentAt: new Date()
      }
    });

    // Отправляем рассылку через Telegram API
    const telegramIds = telegramClients.map(client => client.telegramId!);
    
    let sendResults = null;
    
    // Проверяем, настроен ли Telegram Bot Token
    const isTelegramConfigured = await telegramService.validateToken();
    
    if (isTelegramConfigured) {
      try {
        sendResults = await telegramService.sendBulkMessages(
          telegramIds,
          {
            title,
            text: message,
            photoUrl: photoUrl || undefined
          },
          {
            delay: 100, // Задержка 100ms между сообщениями
            batchSize: 30 // Отправляем по 30 сообщений в батче
          }
        );
      } catch (telegramError: any) {
        console.error('Ошибка при отправке в Telegram:', telegramError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    return NextResponse.json({
      notification,
      sentTo: {
        total: telegramClients.length,
        telegramIds: telegramIds,
        clients: telegramClients.map(client => ({
          id: client.id,
          fullName: client.fullName,
          telegramId: client.telegramId
        })),
        telegramResults: sendResults || {
          success: 0,
          failed: 0,
          errors: [],
          note: isTelegramConfigured ? 'Telegram API недоступен' : 'Telegram Bot Token не настроен'
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при отправке рассылки:', error);
    return NextResponse.json(
      { error: 'Ошибка при отправке рассылки' },
      { status: 500 }
    );
  }
}

// Функция для получения клиентов по фильтру
async function getFilteredClients(filterType: string, filterParams?: any) {
  const now = new Date();
  
  switch (filterType) {
    case 'all':
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null }
        }
      });

    case 'expiring_soon':
      // Клиенты с абонементами, заканчивающимися в ближайшие дни
      const daysAhead = filterParams?.days || 7;
      const expirationDate = new Date();
      expirationDate.setDate(now.getDate() + daysAhead);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              endDate: {
                gte: now,
                lte: expirationDate
              }
            }
          }
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              endDate: {
                gte: now,
                lte: expirationDate
              }
            }
          }
        }
      });

    case 'no_visits':
      // Клиенты без посещений за определенный период
      const daysSinceLastVisit = filterParams?.days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysSinceLastVisit);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          AND: [
            {
              OR: [
                { visits: { none: {} } },
                {
                  visits: {
                    none: {
                      visitDate: { gte: cutoffDate }
                    }
                  }
                }
              ]
            }
          ]
        }
      });

    case 'by_tariff':
      // Клиенты с определенным тарифом
      const tariffId = filterParams?.tariffId;
      if (!tariffId) return [];
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              tariffId: parseInt(tariffId)
            }
          }
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              tariffId: parseInt(tariffId)
            }
          }
        }
      });

    case 'new_clients':
      // Новые клиенты за определенный период
      const daysAgo = filterParams?.days || 7;
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysAgo);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          createdAt: { gte: startDate }
        }
      });

    case 'birthday_today':
      // Клиенты с днем рождения сегодня (если есть поле birthday)
      // Пока что возвращаем пустой массив, так как в схеме нет поля birthday
      return [];

    case 'frozen_subscriptions':
      // Клиенты с замороженными абонементами
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'frozen'
            }
          }
        },
        include: {
          subscriptions: {
            where: {
              status: 'frozen'
            }
          }
        }
      });

    default:
      return [];
  }
}
