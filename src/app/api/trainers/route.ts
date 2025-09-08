import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/trainers
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

    // Получаем тренеров с пагинацией
    const [trainers, totalCount] = await Promise.all([
      prisma.trainer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.trainer.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      trainers,
      pagination: {
        page,
        pages: totalPages,
        total: totalCount,
        limit
      }
    });

  } catch (error) {
    console.error('Ошибка при получении тренеров:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении тренеров' },
      { status: 500 }
    );
  }
}

// POST /api/trainers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, photoUrls } = body;
    console.log('📋 Получены данные тренера с', photoUrls?.length || 0, 'изображениями');

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

    // Проверяем на уникальность имени
    const existingTrainer = await prisma.trainer.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingTrainer) {
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
        console.log(`💾 Сохраняем тренера "${name}" с ${validUrls.length} изображениями`);
      }
    } else {
      console.log(`💾 Сохраняем тренера "${name}" без изображений`);
    }

    const trainer = await prisma.trainer.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price.toString()),
        photoUrl: processedPhotoUrls
      }
    });

    console.log(`✅ Тренер "${name}" успешно создан (ID: ${trainer.id})`);

    return NextResponse.json(trainer, { status: 201 });

  } catch (error) {
    console.error('Ошибка при создании тренера:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тренера' },
      { status: 500 }
    );
  }
}
