import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { name, description, price, photoUrl } = body;

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.toString()),
        photoUrl: photoUrl?.trim() || null
      }
    });

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

    await prisma.product.delete({
      where: { id }
    });

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
