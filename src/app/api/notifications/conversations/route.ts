import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Получаем список клиентов, которые писали сообщения
    // и показываем последнее сообщение для каждого
    const conversations = await prisma.$queryRaw<Array<{
      client_id: number;
      client_name: string;
      client_photo: string | null;
      client_phone: string;
      last_message: string;
      last_message_time: Date;
      unread_count: number;
      sender_role: string;
    }>>`
      SELECT DISTINCT 
        c.id as client_id,
        c.full_name as client_name,
        c.photo_url as client_photo,
        c.phone as client_phone,
        f.message as last_message,
        f.created_at as last_message_time,
        f.sender_role,
        (
          SELECT COUNT(*)
          FROM feedback f2
          WHERE f2.client_id = c.id
          AND f2.sender_role = 'user'
          AND NOT EXISTS (
            SELECT 1 FROM feedback f3
            WHERE f3.parent_id = f2.id
            AND f3.sender_role = 'admin'
          )
        ) as unread_count
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

    // Форматируем результат
    const formattedConversations = conversations.map(conv => ({
      clientId: conv.client_id,
      clientName: conv.client_name,
      clientPhoto: conv.client_photo,
      clientPhone: conv.client_phone,
      lastMessage: conv.last_message,
      lastMessageTime: conv.last_message_time,
      unreadCount: Number(conv.unread_count),
      lastMessageFromUser: conv.sender_role === 'user'
    }));

    return NextResponse.json({
      conversations: formattedConversations,
      total: formattedConversations.length
    });
  } catch (error) {
    console.error('Ошибка получения разговоров:', error);
    return NextResponse.json(
      { error: 'Ошибка получения разговоров' },
      { status: 500 }
    );
  }
}




