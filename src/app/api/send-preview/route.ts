import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - получить превью получателей по фильтру с параметрами
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filterType, filterParams } = body;

    if (!filterType) {
      return NextResponse.json(
        { error: 'Тип фильтра обязателен' },
        { status: 400 }
      );
    }

    // Получаем клиентов по фильтру
    const clients = await getFilteredClients(filterType, filterParams);
    const telegramClients = clients.filter(client => client.telegramId);

    return NextResponse.json({
      count: telegramClients.length,
      clients: telegramClients.map(client => ({
        id: client.id,
        fullName: client.fullName,
        phone: client.phone,
        telegramId: client.telegramId
      }))
    });
  } catch (error) {
    console.error('Ошибка при получении превью:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении превью' },
      { status: 500 }
    );
  }
}

// Функция для получения клиентов по фильтру
async function getFilteredClients(filterType: string, filterParams?: any) {
  const now = new Date();
  
  switch (filterType) {
    case 'all':
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null }
        }
      });

    case 'expiring_soon':
      const daysAhead = filterParams?.days || 7;
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              remainingDays: { lte: daysAhead }
            }
          }
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              remainingDays: { lte: daysAhead }
            }
          }
        }
      });

    case 'new_clients':
      const daysAgo = filterParams?.days || 7;
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysAgo);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          createdAt: { gte: startDate }
        }
      });

    case 'by_tariff':
      const tariffId = filterParams?.tariffId;
      if (!tariffId) return [];
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              tariffId: parseInt(tariffId)
            }
          }
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              tariffId: parseInt(tariffId)
            }
          }
        }
      });

    default:
      return [];
  }
}
