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
            clients: true,
            subscriptions: true
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
    const { name, price, durationDays, duration, freezeLimit } = await request.json();

    // Валидация обязательных полей
    if (!name || !price || !durationDays || !duration || freezeLimit === undefined) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
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
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        duration: parseInt(duration),
        freezeLimit: parseInt(freezeLimit)
      },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
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
