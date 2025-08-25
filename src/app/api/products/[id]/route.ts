import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteMultipleFromS3, extractImageUrls } from '@/lib/s3';

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID продукта' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Продукт не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);

  } catch (error) {
    console.error('Ошибка при получении продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении продукта' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID продукта' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, price, photoUrls } = body;
    console.log('📋 Обновление продукта с', photoUrls?.length || 0, 'изображениями');

    // Валидация
    if (!name || !description || price === undefined) {
      return NextResponse.json(
        { error: 'Название, описание и цена обязательны' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: 'Цена не может быть отрицательной' },
        { status: 400 }
      );
    }

    // Проверяем существование продукта
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Продукт не найден' },
        { status: 404 }
      );
    }

    // Извлекаем старые URL для удаления из S3
    const oldImageUrls = extractImageUrls(existingProduct.photoUrl);

    // Проверяем на уникальность названия (исключая текущий продукт)
    const duplicateProduct = await prisma.product.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (duplicateProduct) {
      return NextResponse.json(
        { error: 'Продукт с таким названием уже существует' },
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

    const updatedProduct = await prisma.product.update({
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

    console.log(`📝 Продукт "${name}" обновлен (ID: ${id})`);

    return NextResponse.json(updatedProduct);

  } catch (error) {
    console.error('Ошибка при обновлении продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении продукта' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Некорректный ID продукта' },
        { status: 400 }
      );
    }

    // Проверяем существование продукта
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Продукт не найден' },
        { status: 404 }
      );
    }

    // Извлекаем URL изображений для удаления из S3
    const imageUrls = extractImageUrls(existingProduct.photoUrl);
    
    // Удаляем продукт из БД
    await prisma.product.delete({
      where: { id }
    });

    // Удаляем изображения из S3 (асинхронно, не блокируем ответ)
    if (imageUrls.length > 0) {
      deleteMultipleFromS3(imageUrls).catch(error => {
        console.error('Ошибка при удалении изображений из S3:', error);
      });
    }

    console.log(`🗑️ Продукт "${existingProduct.name}" удален (ID: ${id})`);

    return NextResponse.json(
      { message: 'Продукт успешно удален' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Ошибка при удалении продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении продукта' },
      { status: 500 }
    );
  }
}
