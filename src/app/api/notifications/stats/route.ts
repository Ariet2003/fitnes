import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Считаем количество сообщений от пользователей без ответа от админа
    // Используем более эффективный запрос с LEFT JOIN
    
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM feedback f1
      WHERE f1.sender_role = 'user'
      AND NOT EXISTS (
        SELECT 1 FROM feedback f2
        WHERE f2.parent_id = f1.id
        AND f2.sender_role = 'admin'
      )
    `;
    
    const totalNotifications = Number(result[0]?.count || 0);
    
    return NextResponse.json({
      total: totalNotifications,
      details: {
        unansweredMessages: totalNotifications
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