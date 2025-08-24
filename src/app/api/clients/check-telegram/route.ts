import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID обязателен' },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { telegramId }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'Клиент с таким Telegram ID уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Ошибка при проверке Telegram ID:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке Telegram ID' },
      { status: 500 }
    );
  }
}
