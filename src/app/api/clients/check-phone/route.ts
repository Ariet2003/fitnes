import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Номер телефона обязателен' },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { phone }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'Клиент с таким номером телефона уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Ошибка при проверке телефона:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке номера телефона' },
      { status: 500 }
    );
  }
}
