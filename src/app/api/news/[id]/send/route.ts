import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { telegramService } from '@/lib/telegram';

// POST - отправить новость в Telegram
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json(
        { error: 'Некорректный ID новости' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { filterType, filterParams } = body;

    if (!filterType) {
      return NextResponse.json(
        { error: 'Тип фильтра обязателен' },
        { status: 400 }
      );
    }

    // Получаем новость
    const news = await prisma.news.findUnique({
      where: { id: newsId }
    });

    if (!news) {
      return NextResponse.json(
        { error: 'Новость не найдена' },
        { status: 404 }
      );
    }

    // Получаем клиентов по фильтру
    const clients = await getFilteredClients(filterType, filterParams);

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено клиентов для отправки' },
        { status: 400 }
      );
    }

    // Фильтруем только клиентов с Telegram ID
    const telegramClients = clients.filter(client => client.telegramId);

    if (telegramClients.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено клиентов с Telegram ID для отправки' },
        { status: 400 }
      );
    }

    // Создаем запись о рассылке новости
    const sendResult = await prisma.sendResult.create({
      data: {
        newsId: newsId,
        filterType: filterType,
        filterParams: filterParams || {},
        totalRecipients: telegramClients.length,
        successCount: 0,
        failedCount: 0,
        pendingCount: telegramClients.length,
        status: 'pending',
        sentAt: new Date()
      }
    });

    // Обновляем статус на "в процессе"
    await prisma.sendResult.update({
      where: { id: sendResult.id },
      data: { status: 'in_progress' }
    });

    // Отправляем через Telegram API
    const telegramIds = telegramClients.map(client => client.telegramId!);
    
    let telegramResults = null;
    let finalStatus = 'completed';
    
    // Проверяем, настроен ли Telegram Bot Token
    const isTelegramConfigured = await telegramService.validateToken();
    
    if (isTelegramConfigured) {
      try {
        telegramResults = await telegramService.sendBulkMessages(
          telegramIds,
          {
            title: `📰 ${news.title}`,
            text: news.content,
            photoUrl: news.photoUrl || undefined
          },
          {
            delay: 100, // Задержка 100ms между сообщениями
            batchSize: 30 // Отправляем по 30 сообщений в батче
          }
        );
      } catch (telegramError: any) {
        console.error('Ошибка при отправке новости в Telegram:', telegramError);
        finalStatus = 'failed';
        telegramResults = {
          success: 0,
          failed: telegramClients.length,
          errors: [{ error: telegramError.message }]
        };
      }
    } else {
      finalStatus = 'failed';
      telegramResults = {
        success: 0,
        failed: 0,
        errors: [],
        note: 'Telegram Bot Token не настроен'
      };
    }

    // Обновляем результат рассылки
    const updatedSendResult = await prisma.sendResult.update({
      where: { id: sendResult.id },
      data: {
        successCount: telegramResults?.success || 0,
        failedCount: telegramResults?.failed || telegramClients.length,
        pendingCount: 0,
        status: finalStatus,
        errorDetails: telegramResults?.errors || [],
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      sendResult: updatedSendResult,
      news: {
        id: news.id,
        title: news.title,
        content: news.content
      },
      sentTo: {
        total: telegramClients.length,
        telegramIds: telegramIds,
        clients: telegramClients.map(client => ({
          id: client.id,
          fullName: client.fullName,
          telegramId: client.telegramId
        })),
        telegramResults: telegramResults || {
          success: 0,
          failed: 0,
          errors: [],
          note: 'Telegram API недоступен'
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при отправке новости:', error);
    return NextResponse.json(
      { error: 'Ошибка при отправке новости' },
      { status: 500 }
    );
  }
}

// Функция для получения клиентов по фильтру (дублируем логику из notifications API)
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
      const expirationDate = new Date();
      expirationDate.setDate(now.getDate() + daysAhead);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'active',
              endDate: {
                gte: now,
                lte: expirationDate
              }
            }
          }
        }
      });

    case 'no_visits':
      const daysSinceLastVisit = filterParams?.days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysSinceLastVisit);
      
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          AND: [
            {
              OR: [
                { visits: { none: {} } },
                {
                  visits: {
                    none: {
                      visitDate: { gte: cutoffDate }
                    }
                  }
                }
              ]
            }
          ]
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

    case 'frozen_subscriptions':
      return await prisma.client.findMany({
        where: {
          telegramId: { not: null },
          subscriptions: {
            some: {
              status: 'frozen'
            }
          }
        }
      });

    default:
      return [];
  }
}
