import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Получаем все разговоры с клиентами
    const baseConversations = await prisma.$queryRaw<Array<{
      client_id: number;
    }>>`
      SELECT DISTINCT c.id as client_id
      FROM clients c
      JOIN feedback f ON c.id = f.client_id
    `;

    // Считаем суммарное количество непрочитанных сообщений используя ту же логику, что и в conversations
    let totalNotifications = 0;
    
    for (const conv of baseConversations) {
      // Получаем последние сообщения клиента в хронологическом порядке
      const recentMessages = await prisma.feedback.findMany({
        where: { clientId: conv.client_id },
        orderBy: { createdAt: 'desc' },
        take: 50, // Берем последние 50 сообщений для анализа
        select: { senderRole: true }
      });

      // Считаем последовательные сообщения пользователя с конца
      let unreadCount = 0;
      for (const message of recentMessages) {
        if (message.senderRole === 'user') {
          unreadCount++;
        } else {
          // Как только встретили сообщение админа - прекращаем счет
          break;
        }
      }
      
      totalNotifications += unreadCount;
    }
    
    return NextResponse.json({
      total: totalNotifications,
      details: {
        unreadMessages: totalNotifications,
        conversationsCount: baseConversations.length
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики уведомлений:', error);
    return NextResponse.json(
      { error: 'Ошибка получения уведомлений' },
      { status: 500 }
    );
  }
}