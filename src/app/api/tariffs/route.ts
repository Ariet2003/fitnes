import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все тарифы
export async function GET() {
  try {
    const tariffs = await prisma.tariff.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'active'
              }
            }
          }
        }
      }
    });

    return NextResponse.json(tariffs);
  } catch (error) {
    console.error('Ошибка при получении тарифов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тарифов' },
      { status: 500 }
    );
  }
}

// POST - создать новый тариф
export async function POST(request: NextRequest) {
  try {
    const { name, price, durationDays, duration, freezeLimit, startTime, endTime } = await request.json();

    // Валидация обязательных полей
    if (!name || price === undefined || durationDays === undefined || duration === undefined || freezeLimit === undefined) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Валидация числовых значений
    const priceValue = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      return NextResponse.json(
        { error: 'Некорректная цена' },
        { status: 400 }
      );
    }

    const durationDaysValue = typeof durationDays === 'number' ? durationDays : parseInt(durationDays);
    if (isNaN(durationDaysValue) || durationDaysValue <= 0) {
      return NextResponse.json(
        { error: 'Некорректное количество дней' },
        { status: 400 }
      );
    }

    const durationValue = typeof duration === 'number' ? duration : parseInt(duration);
    if (isNaN(durationValue) || durationValue <= 0) {
      return NextResponse.json(
        { error: 'Некорректная длительность' },
        { status: 400 }
      );
    }

    const freezeLimitValue = typeof freezeLimit === 'number' ? freezeLimit : parseInt(freezeLimit);
    if (isNaN(freezeLimitValue) || freezeLimitValue < 0) {
      return NextResponse.json(
        { error: 'Некорректный лимит заморозок' },
        { status: 400 }
      );
    }

    // Проверяем уникальность имени тарифа
    const existingTariff = await prisma.tariff.findFirst({
      where: { name }
    });

    if (existingTariff) {
      return NextResponse.json(
        { error: 'Тариф с таким названием уже существует' },
        { status: 409 }
      );
    }

    const tariff = await prisma.tariff.create({
      data: {
        name,
        price: priceValue,
        durationDays: durationDaysValue,
        duration: durationValue,
        freezeLimit: freezeLimitValue,
        startTime: startTime || "08:00",
        endTime: endTime || "13:00"
      },
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'active'
              }
            }
          }
        }
      }
    });

    return NextResponse.json(tariff, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании тарифа:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тарифа' },
      { status: 500 }
    );
  }
}
