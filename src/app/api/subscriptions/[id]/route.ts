import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить абонемент по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const subscriptionId = parseInt((await params).id);

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: true,
        tariff: true,
        visits: {
          orderBy: { visitDate: 'desc' }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Абонемент не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Ошибка при получении абонемента:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении абонемента' },
      { status: 500 }
    );
  }
}

// PUT - обновить абонемент (заморозка, продление и т.д.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const subscriptionId = parseInt((await params).id);
    const body = await request.json();
    const { action, days } = body;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tariff: true }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Абонемент не найден' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'freeze':
        if (subscription.status !== 'active') {
          return NextResponse.json(
            { error: 'Можно заморозить только активный абонемент' },
            { status: 400 }
          );
        }
        if (subscription.freezeUsed >= subscription.tariff.freezeLimit) {
          return NextResponse.json(
            { error: 'Лимит заморозок исчерпан' },
            { status: 400 }
          );
        }

        // Получаем информацию о клиенте для QR кода
        const client = await prisma.client.findUnique({
          where: { id: subscription.clientId },
          select: { telegramId: true }
        });

        // Проверяем, есть ли уже запись на сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingVisit = await prisma.visit.findFirst({
          where: {
            clientId: subscription.clientId,
            visitDate: {
              gte: today,
              lt: tomorrow
            }
          }
        });

        if (existingVisit) {
          return NextResponse.json(
            { error: 'Запись на сегодня уже существует' },
            { status: 400 }
          );
        }
        
        // Создаем запись о заморозке в таблице Visit
        const qrCode = client?.telegramId || `client_${subscription.clientId}`;
        
        await prisma.visit.create({
          data: {
            clientId: subscription.clientId,
            subscriptionId: subscription.id,
            visitDate: new Date(),
            qrCode,
            isFreezeDay: true
          }
        });
        
        // Увеличиваем счетчик заморозок, но НЕ меняем статус абонемента
        updateData = {
          freezeUsed: subscription.freezeUsed + 1
        };
        break;

      case 'unfreeze_day':
        // Разморозка конкретного дня (удаление записи о заморозке)
        const { visitId } = body;
        
        if (!visitId) {
          return NextResponse.json(
            { error: 'ID посещения не указан' },
            { status: 400 }
          );
        }

        // Находим запись о заморозке
        const freezeVisit = await prisma.visit.findUnique({
          where: { id: visitId }
        });

        if (!freezeVisit || !freezeVisit.isFreezeDay) {
          return NextResponse.json(
            { error: 'Запись о заморозке не найдена' },
            { status: 404 }
          );
        }

        // Проверяем, что это сегодняшний день
        const visitDate = new Date(freezeVisit.visitDate);
        const currentDate = new Date();
        
        // Проверяем только дату, игнорируя время
        if (visitDate.toDateString() !== currentDate.toDateString()) {
          return NextResponse.json(
            { error: 'Разморозка возможна только в день заморозки' },
            { status: 400 }
          );
        }

        // Удаляем запись о заморозке
        await prisma.visit.delete({
          where: { id: visitId }
        });

        // Уменьшаем счетчик заморозок
        updateData = {
          freezeUsed: Math.max(0, subscription.freezeUsed - 1)
        };
        break;

      case 'unfreeze':
        if (subscription.status !== 'frozen') {
          return NextResponse.json(
            { error: 'Можно разморозить только замороженный абонемент' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'active'
        };
        break;

      case 'extend':
        if (!days || days <= 0) {
          return NextResponse.json(
            { error: 'Укажите количество дней для продления' },
            { status: 400 }
          );
        }
        const newEndDate = new Date(subscription.endDate);
        newEndDate.setDate(newEndDate.getDate() + parseInt(days));
        
        updateData = {
          endDate: newEndDate,
          remainingDays: subscription.remainingDays + parseInt(days),
          status: 'active'
        };
        break;

      case 'complete':
        updateData = {
          status: 'completed'
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Неизвестное действие' },
          { status: 400 }
        );
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        client: true,
        tariff: true
      }
    });

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error('Ошибка при обновлении абонемента:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении абонемента' },
      { status: 500 }
    );
  }
}

// DELETE - удалить абонемент
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const subscriptionId = parseInt((await params).id);

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Абонемент не найден' },
        { status: 404 }
      );
    }

    await prisma.subscription.delete({
      where: { id: subscriptionId }
    });

    return NextResponse.json({ message: 'Абонемент успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении абонемента:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении абонемента' },
      { status: 500 }
    );
  }
}
