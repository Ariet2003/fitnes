import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить абонементы с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Record<string, unknown> = {};
    
    if (clientId) {
      where.clientId = parseInt(clientId);
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }

    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          client: true,
          tariff: true,
          visits: {
            orderBy: { visitDate: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.subscription.count({ where })
    ]);

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении абонементов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении абонементов' },
      { status: 500 }
    );
  }
}

// POST - создать новый абонемент
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, tariffId, startDate } = body;

    // Проверяем обязательные поля
    if (!clientId || !tariffId || !startDate) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Получаем тариф для расчета даты окончания
    const tariff = await prisma.tariff.findUnique({
      where: { id: parseInt(tariffId) }
    });

    if (!tariff) {
      return NextResponse.json(
        { error: 'Тариф не найден' },
        { status: 404 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + tariff.durationDays);

    // Создаем абонемент
    const subscription = await prisma.subscription.create({
      data: {
        clientId: parseInt(clientId),
        tariffId: parseInt(tariffId),
        startDate: start,
        endDate: end,
        remainingDays: tariff.durationDays,
        status: 'active'
      },
      include: {
        client: true,
        tariff: true
      }
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании абонемента:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании абонемента' },
      { status: 500 }
    );
  }
}
