import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить новость по ID
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

    const news = await prisma.news.findUnique({
      where: { id: newsId }
    });

    if (!news) {
      return NextResponse.json(
        { error: 'Новость не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error('Ошибка при получении новости:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении новости' },
      { status: 500 }
    );
  }
}

// PUT - обновить новость
export async function PUT(
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

    const body = await request.json();
    const { title, content, photoUrl } = body;

    // Проверяем обязательные поля
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Заголовок и содержание обязательны' },
        { status: 400 }
      );
    }

    // Проверяем существование новости
    const existingNews = await prisma.news.findUnique({
      where: { id: newsId }
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: 'Новость не найдена' },
        { status: 404 }
      );
    }

    const updatedNews = await prisma.news.update({
      where: { id: newsId },
      data: {
        title,
        content,
        photoUrl
      }
    });

    return NextResponse.json(updatedNews);
  } catch (error) {
    console.error('Ошибка при обновлении новости:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении новости' },
      { status: 500 }
    );
  }
}

// DELETE - удалить новость
export async function DELETE(
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

    // Проверяем существование новости
    const existingNews = await prisma.news.findUnique({
      where: { id: newsId }
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: 'Новость не найдена' },
        { status: 404 }
      );
    }

    await prisma.news.delete({
      where: { id: newsId }
    });

    return NextResponse.json({ message: 'Новость удалена' });
  } catch (error) {
    console.error('Ошибка при удалении новости:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении новости' },
      { status: 500 }
    );
  }
}
