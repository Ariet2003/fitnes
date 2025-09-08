import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить всех клиентов с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const tariffId = searchParams.get('tariffId');
    const trainerId = searchParams.get('trainerId');
    const allowedSortFields = ['createdAt', 'fullName', 'phone', 'updatedAt', 'trainer'];
    const requestedSortBy = searchParams.get('sortBy') || 'createdAt';
    const sortBy = allowedSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Построение условий фильтрации
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    // Фильтрация по статусу подписок
    if (status && status !== 'all') {
      if (status === 'active') {
        where.subscriptions = {
          some: {
            status: 'active'
          }
        };
      } else if (status === 'no_subscription') {
        where.subscriptions = {
          every: {
            status: 'completed'
          }
        };
      }
    }

    // Фильтрация по тарифу (только для активных подписок)
    if (tariffId) {
      const subscriptionFilter = where.subscriptions as { some?: Record<string, unknown>; every?: Record<string, unknown> } | undefined;
      
      if (!subscriptionFilter) {
        where.subscriptions = {
          some: {
            status: 'active',
            tariffId: parseInt(tariffId)
          }
        };
      } else if (subscriptionFilter.some) {
        where.subscriptions = {
          some: {
            ...subscriptionFilter.some,
            status: 'active',
            tariffId: parseInt(tariffId)
          }
        };
      } else if (subscriptionFilter.every) {
        // Если был фильтр "без абонемента", добавляем условие OR
        where.OR = [
          { subscriptions: subscriptionFilter },
          {
            subscriptions: {
              some: {
                status: 'active',
                tariffId: parseInt(tariffId)
              }
            }
          }
        ];
      }
    }

    // Фильтрация по тренеру (только для активных подписок)
    if (trainerId) {
      const subscriptionFilter = where.subscriptions as { some?: Record<string, unknown>; every?: Record<string, unknown> } | undefined;
      
      if (!subscriptionFilter) {
        where.subscriptions = {
          some: {
            status: 'active',
            trainerId: parseInt(trainerId)
          }
        };
      } else if (subscriptionFilter.some) {
        where.subscriptions = {
          some: {
            ...subscriptionFilter.some,
            status: 'active',
            trainerId: parseInt(trainerId)
          }
        };
      } else if (subscriptionFilter.every) {
        // Если был фильтр "без абонемента", добавляем условие OR
        where.OR = [
          { subscriptions: subscriptionFilter },
          {
            subscriptions: {
              some: {
                status: 'active',
                trainerId: parseInt(trainerId)
              }
            }
          }
        ];
      }
    }

    // Получаем клиентов с пагинацией
    const [clients, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          subscriptions: {
            orderBy: [
              { createdAt: 'desc' }  // Получаем самую последнюю подписку
            ],
            take: 1,
            include: {
              tariff: true,
              trainer: true
            }
          },
          visits: {
            orderBy: { visitDate: 'desc' },
            take: 1
          },
          _count: {
            select: {
              visits: true,
              subscriptions: true
            }
          }
        },
        orderBy: sortBy === 'trainer' ? {
          subscriptions: {
            _count: sortOrder
          }
        } : { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.client.count({ where })
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении клиентов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении клиентов' },
      { status: 500 }
    );
  }
}

// POST - создать нового клиента
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, photoUrl, telegramId, tariffId, trainerId, startDate } = body;

    // Проверяем обязательные поля
    if (!fullName || !phone) {
      return NextResponse.json(
        { error: 'ФИО и телефон обязательны' },
        { status: 400 }
      );
    }

    // Проверяем уникальность телефона и telegram_id
    const existingClientByPhone = await prisma.client.findUnique({
      where: { phone }
    });

    if (existingClientByPhone) {
      return NextResponse.json(
        { error: 'Клиент с таким номером телефона уже существует' },
        { status: 409 }
      );
    }

    if (telegramId) {
      const existingClientByTelegram = await prisma.client.findUnique({
        where: { telegramId }
      });

      if (existingClientByTelegram) {
        return NextResponse.json(
          { error: 'Клиент с таким Telegram ID уже существует' },
          { status: 409 }
        );
      }
    }

    // Создаем клиента в транзакции с увеличенным тайм-аутом
    const result = await prisma.$transaction(async (prisma) => {
      // Создаем клиента
      const client = await prisma.client.create({
        data: {
          fullName,
          phone,
          photoUrl,
          telegramId
        }
      });

      // Если выбран тариф, создаем подписку
      if (tariffId && tariffId !== '') {
        const tariff = await prisma.tariff.findUnique({
          where: { id: parseInt(tariffId, 10) },
          select: { id: true, durationDays: true }
        });

        if (tariff) {
          // Используем переданную дату старта или текущую дату с часовым поясом +6
          let subscriptionStartDate: Date;
          
          if (startDate) {
            // Если передана дата старта, используем её
            subscriptionStartDate = new Date(startDate);
          } else {
            // Иначе используем текущую дату с учетом часового пояса +6 (Алматы/Бишкек)
            const now = new Date();
            subscriptionStartDate = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // +6 часов
          }
          
          const endDate = new Date(subscriptionStartDate);
          endDate.setDate(subscriptionStartDate.getDate() + tariff.durationDays);

          await prisma.subscription.create({
            data: {
              clientId: client.id,
              tariffId: tariff.id,
              trainerId: trainerId && trainerId !== '' ? parseInt(trainerId, 10) : null,
              startDate: subscriptionStartDate,
              endDate,
              status: 'active',
              remainingDays: tariff.durationDays
            }
          });
        }
      }

      return client;
    }, {
      timeout: 15000, // Увеличиваем тайм-аут до 15 секунд
    });

    // Получаем клиента с полными данными после транзакции
    const clientWithRelations = await prisma.client.findUnique({
      where: { id: result.id },
      include: {
        subscriptions: {
          include: {
            tariff: true,
            trainer: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json(clientWithRelations || result, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании клиента:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании клиента' },
      { status: 500 }
    );
  }
}
