import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить тариф по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tariffId = parseInt(id);

    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Некорректный ID тарифа' },
        { status: 400 }
      );
    }

    const tariff = await prisma.tariff.findUnique({
      where: { id: tariffId },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    });

    if (!tariff) {
      return NextResponse.json(
        { error: 'Тариф не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(tariff);
  } catch (error) {
    console.error('Ошибка при получении тарифа:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тарифа' },
      { status: 500 }
    );
  }
}

// PUT - обновить тариф
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tariffId = parseInt(id);

    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Некорректный ID тарифа' },
        { status: 400 }
      );
    }

    const { name, price, durationDays, duration, freezeLimit, startTime, endTime } = await request.json();

    // Проверяем существование тарифа
    const existingTariff = await prisma.tariff.findUnique({
      where: { id: tariffId }
    });

    if (!existingTariff) {
      return NextResponse.json(
        { error: 'Тариф не найден' },
        { status: 404 }
      );
    }

    // Проверяем уникальность имени (исключая текущий тариф)
    if (name && name !== existingTariff.name) {
      const nameExists = await prisma.tariff.findFirst({
        where: { 
          name,
          id: { not: tariffId }
        }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Тариф с таким названием уже существует' },
          { status: 409 }
        );
      }
    }

    const tariff = await prisma.tariff.update({
      where: { id: tariffId },
      data: {
        ...(name && { name }),
        ...(price && { price: parseFloat(price) }),
        ...(durationDays && { durationDays: parseInt(durationDays) }),
        ...(duration && { duration: parseInt(duration) }),
        ...(freezeLimit !== undefined && { freezeLimit: parseInt(freezeLimit) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime })
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

    return NextResponse.json(tariff);
  } catch (error) {
    console.error('Ошибка при обновлении тарифа:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении тарифа' },
      { status: 500 }
    );
  }
}

// DELETE - удалить тариф
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tariffId = parseInt(id);

    if (isNaN(tariffId)) {
      return NextResponse.json(
        { error: 'Некорректный ID тарифа' },
        { status: 400 }
      );
    }

    // Проверяем существование тарифа
    const existingTariff = await prisma.tariff.findUnique({
      where: { id: tariffId },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    });

    if (!existingTariff) {
      return NextResponse.json(
        { error: 'Тариф не найден' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли связанные клиенты или подписки
    if (existingTariff._count.clients > 0 || existingTariff._count.subscriptions > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить тариф, к которому привязаны клиенты или подписки' },
        { status: 409 }
      );
    }

    await prisma.tariff.delete({
      where: { id: tariffId }
    });

    return NextResponse.json({ message: 'Тариф успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении тарифа:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении тарифа' },
      { status: 500 }
    );
  }
}
