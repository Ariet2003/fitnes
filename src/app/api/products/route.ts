import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const skip = (page - 1) * limit;

    // Строим условия для поиска
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    // Валидные поля для сортировки
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
    const orderBy = validSortFields.includes(sortBy) ? {
      [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
    } : { createdAt: 'desc' };

    // Получаем продукты с пагинацией
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      products,
      pagination: {
        page,
        pages: totalPages,
        total: totalCount,
        limit
      }
    });

  } catch (error) {
    console.error('Ошибка при получении продуктов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении продуктов' },
      { status: 500 }
    );
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
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

    // Проверяем на уникальность названия
    const existingProduct = await prisma.product.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Продукт с таким названием уже существует' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.toString()),
        photoUrl: photoUrl?.trim() || null
      }
    });

    return NextResponse.json(product, { status: 201 });

  } catch (error) {
    console.error('Ошибка при создании продукта:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании продукта' },
      { status: 500 }
    );
  }
}
