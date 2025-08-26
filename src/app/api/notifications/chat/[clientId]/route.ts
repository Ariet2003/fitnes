import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все сообщения чата с клиентом
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const clientIdNum = parseInt(clientId);

    if (isNaN(clientIdNum)) {
      return NextResponse.json(
        { error: 'Некорректный ID клиента' },
        { status: 400 }
      );
    }

    // Получаем информацию о клиенте
    const client = await prisma.client.findUnique({
      where: { id: clientIdNum },
      select: {
        id: true,
        fullName: true,
        photoUrl: true,
        phone: true
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Получаем все сообщения, связанные с диалогом этого клиента
    // Используем более простой подход - все сообщения где либо clientId совпадает, 
    // либо это цепочка сообщений, начинающаяся от этого клиента
    const messages = await prisma.$queryRaw<Array<{
      id: number;
      client_id: number | null;
      parent_id: number | null;
      sender_role: string;
      message: string;
      created_at: Date;
    }>>`
      WITH RECURSIVE message_chain AS (
        -- Начальные сообщения клиента
        SELECT id, client_id, parent_id, sender_role, message, created_at, 0 as level
        FROM feedback 
        WHERE client_id = ${clientIdNum} AND sender_role = 'user'
        
        UNION ALL
        
        -- Все сообщения, которые ссылаются на сообщения в цепочке
        SELECT f.id, f.client_id, f.parent_id, f.sender_role, f.message, f.created_at, mc.level + 1
        FROM feedback f
        INNER JOIN message_chain mc ON f.parent_id = mc.id
      )
      SELECT DISTINCT id, client_id, parent_id, sender_role, message, created_at
      FROM message_chain
      ORDER BY created_at ASC
    `;

    // Преобразуем результаты raw query в нужный формат
    const chatMessages = messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      senderRole: msg.sender_role,
      createdAt: msg.created_at,
      isReply: !!msg.parent_id,
      parentId: msg.parent_id
    }));

    return NextResponse.json({
      client,
      messages: chatMessages,
      total: chatMessages.length
    });
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    return NextResponse.json(
      { error: 'Ошибка получения чата' },
      { status: 500 }
    );
  }
}

// POST - отправить сообщение в чат
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const clientIdNum = parseInt(clientId);
    const body = await request.json();
    const { message, parentId } = body;

    if (isNaN(clientIdNum)) {
      return NextResponse.json(
        { error: 'Некорректный ID клиента' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Сообщение обязательно' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли клиент
    const client = await prisma.client.findUnique({
      where: { id: clientIdNum }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Если указан parentId, проверяем, что родительское сообщение существует
    if (parentId) {
      const parentMessage = await prisma.feedback.findUnique({
        where: { id: parseInt(parentId) }
      });

      if (!parentMessage || parentMessage.clientId !== clientIdNum) {
        return NextResponse.json(
          { error: 'Родительское сообщение не найдено' },
          { status: 404 }
        );
      }
    }

    // Создаем новое сообщение от админа
    const newMessage = await prisma.feedback.create({
      data: {
        clientId: clientIdNum,
        parentId: parentId ? parseInt(parentId) : null,
        senderRole: 'admin',
        message: message.trim()
      }
    });

    return NextResponse.json({
      message: newMessage,
      success: true
    }, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json(
      { error: 'Ошибка отправки сообщения' },
      { status: 500 }
    );
  }
}
