import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Сначала получаем базовую информацию о разговорах
    const baseConversations = await prisma.$queryRaw<Array<{
      client_id: number;
      client_name: string;
      client_photo: string | null;
      client_phone: string;
      last_message: string;
      last_message_time: Date;
      sender_role: string;
    }>>`
      SELECT DISTINCT 
        c.id as client_id,
        c.full_name as client_name,
        c.photo_url as client_photo,
        c.phone as client_phone,
        f.message as last_message,
        f.created_at as last_message_time,
        f.sender_role
      FROM clients c
      JOIN feedback f ON c.id = f.client_id
      WHERE f.id IN (
        SELECT MAX(f_inner.id)
        FROM feedback f_inner
        WHERE f_inner.client_id = c.id
        GROUP BY f_inner.client_id
      )
      ORDER BY f.created_at DESC
    `;

    // Теперь для каждого клиента вычисляем количество последовательных сообщений от пользователя
    const conversationsWithUnreadCount = await Promise.all(
      baseConversations.map(async (conv) => {
        // Получаем последние сообщения клиента в хронологическом порядке
        const recentMessages = await prisma.feedback.findMany({
          where: { clientId: conv.client_id },
          orderBy: { createdAt: 'desc' },
          take: 50, // Берем последние 50 сообщений для анализа
          select: { senderRole: true, createdAt: true }
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

        return {
          clientId: conv.client_id,
          clientName: conv.client_name,
          clientPhoto: conv.client_photo,
          clientPhone: conv.client_phone,
          lastMessage: conv.last_message,
          lastMessageTime: conv.last_message_time,
          unreadCount: unreadCount,
          lastMessageFromUser: conv.sender_role === 'user'
        };
      })
    );

    return NextResponse.json({
      conversations: conversationsWithUnreadCount,
      total: conversationsWithUnreadCount.length
    });
  } catch (error) {
    console.error('Ошибка получения разговоров:', error);
    return NextResponse.json(
      { error: 'Ошибка получения разговоров' },
      { status: 500 }
    );
  }
}





