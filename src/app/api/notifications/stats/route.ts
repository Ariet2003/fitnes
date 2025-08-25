import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить статистику рассылок
export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalNotifications,
      monthlyNotifications,
      weeklyNotifications,
      totalClients,
      clientsWithTelegram,
      recentNews,
      filterStats
    ] = await Promise.all([
      // Общее количество рассылок
      prisma.notification.count(),
      
      // Рассылки за месяц
      prisma.notification.count({
        where: {
          sentAt: { gte: startOfMonth }
        }
      }),
      
      // Рассылки за неделю
      prisma.notification.count({
        where: {
          sentAt: { gte: startOfWeek }
        }
      }),
      
      // Общее количество клиентов
      prisma.client.count(),
      
      // Клиенты с Telegram ID
      prisma.client.count({
        where: {
          telegramId: { not: null }
        }
      }),
      
      // Последние новости
      prisma.news.count({
        where: {
          createdAt: { gte: startOfWeek }
        }
      }),
      
      // Статистика по фильтрам
      Promise.all([
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
        prisma.client.count({
          where: {
            telegramId: { not: null },
            createdAt: { gte: startOfWeek }
          }
        }),
        prisma.client.count({
          where: {
            telegramId: { not: null },
            subscriptions: {
              some: {
                status: 'frozen'
              }
            }
          }
        })
      ])
    ]);

    const [expiringSoon, newClients, frozenSubscriptions] = filterStats;

    const stats = {
      notifications: {
        total: totalNotifications,
        monthly: monthlyNotifications,
        weekly: weeklyNotifications
      },
      clients: {
        total: totalClients,
        withTelegram: clientsWithTelegram,
        coverage: totalClients > 0 ? Math.round((clientsWithTelegram / totalClients) * 100) : 0
      },
      news: {
        recentCount: recentNews
      },
      filters: {
        expiringSoon,
        newClients,
        frozenSubscriptions
      },
      engagement: {
        // Процент охвата Telegram
        telegramCoverage: totalClients > 0 ? Math.round((clientsWithTelegram / totalClients) * 100) : 0,
        // Активность рассылок
        avgNotificationsPerWeek: weeklyNotifications
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статистики' },
      { status: 500 }
    );
  }
}
