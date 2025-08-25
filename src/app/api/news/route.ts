import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все новости
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { content: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {};

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.news.count({ where })
    ]);

    return NextResponse.json({
      news,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении новостей:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении новостей' },
      { status: 500 }
    );
  }
}

// POST - создать новость
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, photoUrl } = body;

    // Проверяем обязательные поля
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Заголовок и содержание обязательны' },
        { status: 400 }
      );
    }

    const news = await prisma.news.create({
      data: {
        title,
        content,
        photoUrl
      }
    });

    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании новости:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании новости' },
      { status: 500 }
    );
  }
}
