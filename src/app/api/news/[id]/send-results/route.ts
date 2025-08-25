import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить результаты рассылок для конкретной новости
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Проверяем существование новости
    const news = await prisma.news.findUnique({
      where: { id: newsId }
    });

    if (!news) {
      return NextResponse.json(
        { error: 'Новость не найдена' },
        { status: 404 }
      );
    }

    // Получаем результаты рассылок
    const [sendResults, total] = await Promise.all([
      prisma.sendResult.findMany({
        where: { newsId },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.sendResult.count({ where: { newsId } })
    ]);

    return NextResponse.json({
      news: {
        id: news.id,
        title: news.title,
        content: news.content,
        photoUrl: news.photoUrl
      },
      sendResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении результатов рассылок:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении результатов рассылок' },
      { status: 500 }
    );
  }
}
