import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить всех клиентов с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    // const status = searchParams.get('status'); // Убрано - поле status удалено из модели
    const tariffId = searchParams.get('tariffId');
    const allowedSortFields = ['createdAt', 'fullName', 'phone', 'updatedAt'];
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

    // Убираем фильтр по статусу клиента, так как поле удалено
    // if (status !== null && status !== 'all') {
    //   where.status = status === 'active';
    // }

    if (tariffId) {
      where.tariffId = parseInt(tariffId);
    }

    // Получаем клиентов с пагинацией
    const [clients, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          tariff: true,
          subscriptions: {
            where: { status: 'active' },
            orderBy: { endDate: 'desc' },
            take: 1,
            include: {
              tariff: true
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
        orderBy: { [sortBy]: sortOrder },
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
    const { fullName, phone, photoUrl, telegramId, tariffId } = body;

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
          telegramId,
          tariffId: tariffId && tariffId !== '' ? parseInt(tariffId, 10) : null
        }
      });

      // Если выбран тариф, создаем подписку
      if (tariffId && tariffId !== '') {
        const tariff = await prisma.tariff.findUnique({
          where: { id: parseInt(tariffId, 10) },
          select: { id: true, durationDays: true }
        });

        if (tariff) {
          // Создаем дату с учетом часового пояса +6 (Алматы/Бишкек)
          const now = new Date();
          const startDate = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // +6 часов
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + tariff.durationDays);

          await prisma.subscription.create({
            data: {
              clientId: client.id,
              tariffId: tariff.id,
              startDate,
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
        tariff: true,
        subscriptions: {
          include: {
            tariff: true
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
