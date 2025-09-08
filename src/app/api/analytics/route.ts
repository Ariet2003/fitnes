import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionTokenEdge } from '@/lib/auth-edge';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, format } from 'date-fns';
import { ru } from 'date-fns/locale';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await verifySessionTokenEdge(token);
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    const now = new Date();
    let startDate: Date;
    let endDate = now;

    // Определяем период для анализа
    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 7);
    }

    // Получаем основную статистику
    const [
      totalClients,
      activeSubscriptions,
      totalVisits,
      allSubscriptions,
      newClientsThisPeriod,
      visitsThisPeriod,
      periodSubscriptions,
      expiredSubscriptions,
      feedbackCount,
      newsCount,
      totalTrainers,
      activeTrainersThisPeriod
    ] = await Promise.all([
      // Общее количество клиентов
      prisma.client.count(),
      
      // Активные абонементы
      prisma.subscription.count({
        where: {
          status: 'active',
          endDate: {
            gte: now
          }
        }
      }),
      
      // Общее количество посещений
      prisma.visit.count(),
      
      // Общая выручка от всех абонементов (получаем все подписки с тарифами)
      prisma.subscription.findMany({
        include: {
          tariff: true
        }
      }),
      
      // Новые клиенты за период
      prisma.client.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Посещения за период
      prisma.visit.count({
        where: {
          visitDate: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Выручка за период (получаем подписки за период с тарифами)
      prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          tariff: true
        }
      }),
      
      // Истекшие абонементы
      prisma.subscription.count({
        where: {
          status: 'completed',
          endDate: {
            lt: now
          }
        }
      }),
      
      // Количество отзывов
      prisma.feedback.count(),
      
      // Количество новостей
      prisma.news.count(),
      
      // Общее количество тренеров
      prisma.trainer.count(),
      
      // Активные тренеры за период (тренеры с новыми подписками)
      prisma.trainer.count({
        where: {
          subscriptions: {
            some: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      })
    ]);

    // Получаем общее количество продаж (подписок)
    const totalSales = await prisma.subscription.count();
    
    // Продажи за текущий период
    const salesThisPeriod = periodSubscriptions.length;

    // Вычисляем общую выручку
    const totalRevenue = allSubscriptions.reduce((sum, subscription) => {
      return sum + (subscription.tariff ? Number(subscription.tariff.price) : 0);
    }, 0);

    // Вычисляем выручку за период
    const revenueThisPeriod = periodSubscriptions.reduce((sum, subscription) => {
      return sum + (subscription.tariff ? Number(subscription.tariff.price) : 0);
    }, 0);

    // Динамика новых клиентов (по дням за последние 30 дней)
    const clientsGrowthData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = await prisma.client.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
      
      clientsGrowthData.push({
        date: format(startOfDay, 'dd.MM', { locale: ru }),
        count,
        fullDate: startOfDay.toISOString()
      });
    }

    // Динамика посещений (по дням за последние 30 дней)
    const visitsData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = await prisma.visit.count({
        where: {
          visitDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
      
      visitsData.push({
        date: format(startOfDay, 'dd.MM', { locale: ru }),
        visits: count,
        fullDate: startOfDay.toISOString()
      });
    }

    // Популярные тарифы
    const popularTariffs = await prisma.tariff.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      },
      orderBy: {
        subscriptions: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Статистика по статусам абонементов
    const subscriptionStats = await prisma.subscription.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Выручка по месяцам (последние 6 месяцев)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const subscriptions = await prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        include: {
          tariff: true
        }
      });
      
      const revenue = subscriptions.reduce((sum, subscription) => {
        return sum + (subscription.tariff ? Number(subscription.tariff.price) : 0);
      }, 0);
      
      revenueByMonth.push({
        month: format(monthStart, 'MMM', { locale: ru }),
        revenue,
        fullDate: monthStart.toISOString()
      });
    }

    // Статистика посещений по дням недели
    const visitsByWeekday = await prisma.visit.findMany({
      select: {
        visitDate: true
      },
      where: {
        visitDate: {
          gte: subDays(now, 30)
        }
      }
    });

    const weekdayStats = [
      { day: 'Пн', visits: 0 },
      { day: 'Вт', visits: 0 },
      { day: 'Ср', visits: 0 },
      { day: 'Чт', visits: 0 },
      { day: 'Пт', visits: 0 },
      { day: 'Сб', visits: 0 },
      { day: 'Вс', visits: 0 }
    ];

    visitsByWeekday.forEach(visit => {
      const dayOfWeek = visit.visitDate.getDay();
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Понедельник = 0
      weekdayStats[index].visits++;
    });

    // Топ активных клиентов (по количеству посещений)
    const topClients = await prisma.client.findMany({
      include: {
        _count: {
          select: {
            visits: true
          }
        }
      },
      orderBy: {
        visits: {
          _count: 'desc'
        }
      },
      take: 10
    });

    // Статистика по тренерам
    const popularTrainers = await prisma.trainer.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        },
        subscriptions: {
          include: {
            tariff: true
          }
        }
      },
      orderBy: {
        subscriptions: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Выручка по тренерам
    const trainerRevenue = popularTrainers.map(trainer => {
      const revenue = trainer.subscriptions.reduce((sum, subscription) => {
        return sum + (subscription.tariff ? Number(subscription.tariff.price) : 0) + Number(trainer.price);
      }, 0);
      
      return {
        id: trainer.id,
        name: trainer.name,
        subscriptions: trainer._count.subscriptions,
        revenue: revenue,
        price: Number(trainer.price)
      };
    });

    // Распределение клиентов по тренерам
    const trainerDistribution = await prisma.subscription.groupBy({
      by: ['trainerId'],
      _count: {
        trainerId: true
      },
      where: {
        status: 'active',
        trainerId: {
          not: null
        }
      }
    });

    // Получаем имена тренеров для распределения
    const trainerNames = await prisma.trainer.findMany({
      where: {
        id: {
          in: trainerDistribution.map(t => t.trainerId).filter(Boolean) as number[]
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Считаем клиентов без тренера
    const clientsWithoutTrainer = await prisma.subscription.count({
      where: {
        status: 'active',
        trainerId: null
      }
    });

    const trainerStats = [
      ...trainerDistribution.map(stat => {
        const trainer = trainerNames.find(t => t.id === stat.trainerId);
        return {
          name: trainer?.name || `Тренер ${stat.trainerId}`,
          clients: stat._count.trainerId
        };
      }),
      {
        name: 'Без тренера',
        clients: clientsWithoutTrainer
      }
    ];

    return NextResponse.json({
      overview: {
        totalClients,
        activeSubscriptions,
        totalVisits,
        totalRevenue,
        newClientsThisPeriod,
        visitsThisPeriod,
        revenueThisPeriod,
        expiredSubscriptions,
        feedbackCount,
        newsCount,
        totalTrainers,
        activeTrainersThisPeriod,
        totalSales,
        salesThisPeriod
      },
      charts: {
        clientsGrowth: clientsGrowthData,
        visitsOverTime: visitsData,
        popularTariffs: popularTariffs.map(tariff => ({
          name: tariff.name,
          subscriptions: tariff._count.subscriptions,
          price: Number(tariff.price)
        })),
        subscriptionStats: subscriptionStats.map(stat => ({
          status: stat.status,
          count: stat._count.status
        })),
        revenueByMonth,
        visitsByWeekday: weekdayStats,
        topClients: topClients.map(client => ({
          id: client.id,
          fullName: client.fullName,
          visits: client._count.visits
        })),
        popularTrainers: popularTrainers.map(trainer => ({
          id: trainer.id,
          name: trainer.name,
          subscriptions: trainer._count.subscriptions,
          price: Number(trainer.price)
        })),
        trainerRevenue,
        trainerDistribution: trainerStats
      },
      period
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
