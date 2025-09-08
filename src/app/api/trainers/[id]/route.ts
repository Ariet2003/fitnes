import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteMultipleFromS3, extractImageUrls } from '@/lib/s3';

// GET /api/trainers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID тренера' },
        { status: 400 }
      );
    }

    const trainer = await prisma.trainer.findUnique({
      where: { id }
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Тренер не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(trainer);

  } catch (error) {
    console.error('Ошибка при получении тренера:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тренера' },
      { status: 500 }
    );
  }
}

// PUT /api/trainers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID тренера' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, photoUrls } = body;
    console.log('📋 Обновление тренера с', photoUrls?.length || 0, 'изображениями');

    // Валидация
    if (!name || !description || price === undefined) {
      return NextResponse.json(
        { error: 'Имя, описание и цена обязательны' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: 'Цена не может быть отрицательной' },
        { status: 400 }
      );
    }

    // Проверяем существование тренера
    const existingTrainer = await prisma.trainer.findUnique({
      where: { id }
    });

    if (!existingTrainer) {
      return NextResponse.json(
        { error: 'Тренер не найден' },
        { status: 404 }
      );
    }

    // Извлекаем старые URL для удаления из S3
    const oldImageUrls = extractImageUrls(existingTrainer.photoUrl);

    // Проверяем на уникальность имени (исключая текущего тренера)
    const duplicateTrainer = await prisma.trainer.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (duplicateTrainer) {
      return NextResponse.json(
        { error: 'Тренер с таким именем уже существует' },
        { status: 400 }
      );
    }

    // Валидируем и преобразуем массив изображений
    let processedPhotoUrls = null;
    if (photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0) {
      // Фильтруем пустые URL и валидируем
      const validUrls = photoUrls.filter(url => url && typeof url === 'string' && url.trim().length > 0);
      if (validUrls.length > 0) {
        processedPhotoUrls = JSON.stringify(validUrls);
      }
    }

    const updatedTrainer = await prisma.trainer.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.toString()),
        photoUrl: processedPhotoUrls
      }
    });

    // Удаляем старые изображения из S3 (если они отличаются от новых)
    const newImageUrls = photoUrls && Array.isArray(photoUrls) ? photoUrls : [];
    const imagesToDelete = oldImageUrls.filter(oldUrl => !newImageUrls.includes(oldUrl));
    
    if (imagesToDelete.length > 0) {
      deleteMultipleFromS3(imagesToDelete).catch(error => {
        console.error('Ошибка при удалении старых изображений из S3:', error);
      });
    }

    console.log(`📝 Тренер "${name}" обновлен (ID: ${id})`);

    return NextResponse.json(updatedTrainer);

  } catch (error) {
    console.error('Ошибка при обновлении тренера:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении тренера' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID тренера' },
        { status: 400 }
      );
    }

    // Проверяем существование тренера
    const existingTrainer = await prisma.trainer.findUnique({
      where: { id }
    });

    if (!existingTrainer) {
      return NextResponse.json(
        { error: 'Тренер не найден' },
        { status: 404 }
      );
    }

    // Извлекаем URL изображений для удаления из S3
    const imageUrls = extractImageUrls(existingTrainer.photoUrl);
    
    // Удаляем тренера из БД
    await prisma.trainer.delete({
      where: { id }
    });

    // Удаляем изображения из S3 (асинхронно, не блокируем ответ)
    if (imageUrls.length > 0) {
      deleteMultipleFromS3(imageUrls).catch(error => {
        console.error('Ошибка при удалении изображений из S3:', error);
      });
    }

    console.log(`🗑️ Тренер "${existingTrainer.name}" удален (ID: ${id})`);

    return NextResponse.json(
      { message: 'Тренер успешно удален' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Ошибка при удалении тренера:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении тренера' },
      { status: 500 }
    );
  }
}
