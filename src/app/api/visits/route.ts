import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = await request.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID обязателен' },
        { status: 400 }
      );
    }

    // Найдем клиента по telegram ID
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: {
            tariff: true
          },
          orderBy: { endDate: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Клиент не найден в системе',
        errorType: 'CLIENT_NOT_FOUND'
      });
    }

    // Проверим активные абонементы
    const activeSubscription = client.subscriptions[0];
    
    if (!activeSubscription) {
      return NextResponse.json({
        success: false,
        error: 'У клиента нет активного абонемента',
        errorType: 'NO_ACTIVE_SUBSCRIPTION',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        }
      });
    }

    // Проверим срок действия абонемента
    const now = new Date();
    if (now > activeSubscription.endDate) {
      return NextResponse.json({
        success: false,
        error: 'Срок действия абонемента истек',
        errorType: 'SUBSCRIPTION_EXPIRED',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        },
        subscription: {
          endDate: activeSubscription.endDate,
          tariffName: activeSubscription.tariff.name
        }
      });
    }

    // Проверим рабочие часы фитнес-клуба
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour + currentMinutes / 60;
    
    const startTime = parseFloat(activeSubscription.tariff.startTime.replace(':', '.'));
    const endTime = parseFloat(activeSubscription.tariff.endTime.replace(':', '.'));
    
    if (currentTime < startTime || currentTime > endTime) {
      return NextResponse.json({
        success: false,
        error: `Фитнес-клуб работает с ${activeSubscription.tariff.startTime} до ${activeSubscription.tariff.endTime}`,
        errorType: 'OUTSIDE_WORKING_HOURS',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        },
        workingHours: {
          start: activeSubscription.tariff.startTime,
          end: activeSubscription.tariff.endTime
        }
      });
    }

    // Проверим, не было ли уже посещения сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayVisit = await prisma.visit.findFirst({
      where: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (todayVisit) {
      return NextResponse.json({
        success: false,
        error: 'Посещение на сегодня уже отмечено',
        errorType: 'ALREADY_VISITED_TODAY',
        client: {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone
        },
        visitTime: todayVisit.visitDate
      });
    }

    // Все проверки пройдены, возвращаем информацию для подтверждения
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        photoUrl: client.photoUrl
      },
      subscription: {
        id: activeSubscription.id,
        tariffName: activeSubscription.tariff.name,
        endDate: activeSubscription.endDate,
        remainingDays: activeSubscription.remainingDays
      }
    });

  } catch (error) {
    console.error('Ошибка при валидации посещения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Подтверждение посещения
export async function PUT(request: NextRequest) {
  try {
    const { telegramId } = await request.json();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID обязателен' },
        { status: 400 }
      );
    }

    // Повторяем проверки
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: {
            tariff: true
          },
          orderBy: { endDate: 'desc' }
        }
      }
    });

    if (!client || !client.subscriptions[0]) {
      return NextResponse.json(
        { error: 'Клиент или абонемент не найден' },
        { status: 400 }
      );
    }

    const activeSubscription = client.subscriptions[0];

    // Проверим, не было ли уже посещения сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayVisit = await prisma.visit.findFirst({
      where: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (todayVisit) {
      return NextResponse.json(
        { error: 'Посещение на сегодня уже отмечено' },
        { status: 400 }
      );
    }

    // Создаем запись о посещении
    const visit = await prisma.visit.create({
      data: {
        clientId: client.id,
        subscriptionId: activeSubscription.id,
        visitDate: new Date(),
        qrCode: telegramId, // Используем telegram ID как QR код
        isFreezeDay: false
      }
    });

    // Уменьшаем количество оставшихся дней
    if (activeSubscription.remainingDays > 0) {
      await prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          remainingDays: {
            decrement: 1
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        visitDate: visit.visitDate
      },
      client: {
        id: client.id,
        fullName: client.fullName
      }
    });

  } catch (error) {
    console.error('Ошибка при создании посещения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
