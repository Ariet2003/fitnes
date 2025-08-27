import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToS3, deleteFromS3, generateFileName } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'Файл изображения не найден' },
        { status: 400 }
      );
    }

    // Проверяем тип файла
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Файл должен быть изображением' },
        { status: 400 }
      );
    }

    // Проверяем размер файла (максимум 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Размер файла не должен превышать 5MB' },
        { status: 400 }
      );
    }

    // Получаем текущее изображение для удаления
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'welcome_image_url' }
    });

    // Загружаем новое изображение в S3
    const buffer = Buffer.from(await image.arrayBuffer());
    const fileName = generateFileName(image.name);
    const imageUrl = await uploadToS3(buffer, fileName, image.type, 'bot-images');

    // Сохраняем URL в базе данных
    await prisma.setting.upsert({
      where: { key: 'welcome_image_url' },
      update: {
        value: imageUrl,
        updatedAt: new Date()
      },
      create: {
        key: 'welcome_image_url',
        value: imageUrl
      }
    });

    // Удаляем старое изображение из S3 (если было)
    if (currentSetting?.value) {
      try {
        await deleteFromS3(currentSetting.value);
      } catch (error) {
        console.error('Ошибка при удалении старого изображения:', error);
        // Не блокируем процесс, если старое изображение не удалилось
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Изображение успешно загружено'
    });

  } catch (error) {
    console.error('Ошибка при загрузке изображения:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке изображения' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Получаем текущее изображение
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'welcome_image_url' }
    });

    if (!currentSetting?.value) {
      return NextResponse.json(
        { error: 'Изображение не найдено' },
        { status: 404 }
      );
    }

    // Удаляем изображение из S3
    await deleteFromS3(currentSetting.value);

    // Удаляем запись из базы данных
    await prisma.setting.delete({
      where: { key: 'welcome_image_url' }
    });

    return NextResponse.json({
      success: true,
      message: 'Изображение успешно удалено'
    });

  } catch (error) {
    console.error('Ошибка при удалении изображения:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении изображения' },
      { status: 500 }
    );
  }
}
