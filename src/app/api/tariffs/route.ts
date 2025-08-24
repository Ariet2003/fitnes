import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все тарифы
export async function GET() {
  try {
    const tariffs = await prisma.tariff.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    });

    return NextResponse.json(tariffs);
  } catch (error) {
    console.error('Ошибка при получении тарифов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тарифов' },
      { status: 500 }
    );
  }
}
