import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить доступные фильтры и их статистику
export async function GET() {
  try {
    const now = new Date();
    
    // Получаем статистику по различным фильтрам
    const [
      totalClientsWithTelegram,
      expiringSoonCount,
      noVisitsCount,
      newClientsCount,
      frozenSubscriptionsCount,
      tariffs
    ] = await Promise.all([
      // Всего клиентов с Telegram
      prisma.client.count({
        where: { telegramId: { not: null } }
      }),
      
      // Клиенты с заканчивающимися абонементами (7 дней)
      prisma.client.count({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              endDate: {
                gte: now,
                lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // Клиенты без посещений за 30 дней
      prisma.client.count({
        where: {
          telegramId: { not: null },
          AND: [
            {
              OR: [
                { visits: { none: {} } },
                {
                  visits: {
                    none: {
                      visitDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                  }
                }
              ]
            }
          ]
        }
      }),
      
      // Новые клиенты за 7 дней
      prisma.client.count({
        where: {
          telegramId: { not: null },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      
      // Клиенты с замороженными абонементами
      prisma.client.count({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'frozen'
            }
          }
        }
      }),
      
      // Тарифы с количеством активных клиентов
      prisma.tariff.findMany({
        include: {
          _count: {
            select: {
              subscriptions: {
                where: {
                  status: 'active',
                  client: {
                    telegramId: { not: null }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    const filters = [
      {
        id: 'all',
        name: 'Все клиенты',
        description: 'Всем клиентам с Telegram',
        count: totalClientsWithTelegram,
        icon: '👥'
      },
      {
        id: 'expiring_soon',
        name: 'Заканчивающиеся абонементы',
        description: 'Клиенты с абонементами, заканчивающимися в ближайшие дни',
        count: expiringSoonCount,
        icon: '⏰',
        params: {
          days: { type: 'number', default: 7, label: 'Дней до окончания' }
        }
      },
      {
        id: 'no_visits',
        name: 'Давно не посещали',
        description: 'Клиенты без посещений за определенный период',
        count: noVisitsCount,
        icon: '😴',
        params: {
          days: { type: 'number', default: 30, label: 'Дней без посещений' }
        }
      },
      {
        id: 'new_clients',
        name: 'Новые клиенты',
        description: 'Недавно зарегистрированные клиенты',
        count: newClientsCount,
        icon: '🆕',
        params: {
          days: { type: 'number', default: 7, label: 'Дней с регистрации' }
        }
      },
      {
        id: 'frozen_subscriptions',
        name: 'Замороженные абонементы',
        description: 'Клиенты с замороженными абонементами',
        count: frozenSubscriptionsCount,
        icon: '🧊'
      },
      {
        id: 'by_tariff',
        name: 'По тарифу',
        description: 'Клиенты с определенным тарифом',
        count: 0, // Будет пересчитано при выборе тарифа
        icon: '💎',
        params: {
          tariffId: { 
            type: 'select', 
            label: 'Выберите тариф',
            options: tariffs.map(tariff => ({
              value: tariff.id,
              label: tariff.name,
              count: tariff._count.subscriptions
            }))
          }
        }
      }
    ];

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('Ошибка при получении фильтров:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении фильтров' },
      { status: 500 }
    );
  }
}

// POST - получить превью клиентов по фильтру
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filterType, filterParams } = body;

    if (!filterType) {
      return NextResponse.json(
        { error: 'Тип фильтра обязателен' },
        { status: 400 }
      );
    }

    // Получаем клиентов по фильтру (логика такая же как в основном API)
    const clients = await getFilteredClients(filterType, filterParams);
    const telegramClients = clients.filter(client => client.telegramId);

    return NextResponse.json({
      count: telegramClients.length,
      preview: telegramClients.slice(0, 10).map(client => ({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        telegramId: client.telegramId
      }))
    });
  } catch (error) {
    console.error('Ошибка при получении превью:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении превью' },
      { status: 500 }
    );
  }
}

// Функция для получения клиентов по фильтру (дублируем из основного API)
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
        }
      });

    case 'no_visits':
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
        }
      });

    case 'new_clients':
      const daysAgo = filterParams?.days || 7;
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysAgo);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          createdAt: { gte: startDate }
        }
      });

    case 'frozen_subscriptions':
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'frozen'
            }
          }
        }
      });

    default:
      return [];
  }
}
