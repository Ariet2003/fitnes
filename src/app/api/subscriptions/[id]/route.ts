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
        updateData = {
          status: 'frozen',
          freezeUsed: subscription.freezeUsed + 1
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
