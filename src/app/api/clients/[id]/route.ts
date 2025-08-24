import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromS3 } from '@/lib/s3';

// GET - получить клиента по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = parseInt((await params).id);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tariff: true,
        subscriptions: {
          include: {
            tariff: true,
            visits: {
              orderBy: { visitDate: 'desc' },
              take: 10
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        visits: {
          include: {
            subscription: {
              include: {
                tariff: true
              }
            }
          },
          orderBy: { visitDate: 'desc' },
          take: 20
        },
        feedback: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Ошибка при получении клиента:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении клиента' },
      { status: 500 }
    );
  }
}

// PUT - обновить клиента
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = parseInt((await params).id);
    const body = await request.json();
    const { fullName, phone, photoUrl, telegramId, tariffId } = body;

    // Проверяем существование клиента
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Проверяем уникальность телефона (если он изменился)
    if (phone && phone !== existingClient.phone) {
      const phoneExists = await prisma.client.findUnique({
        where: { phone }
      });

      if (phoneExists) {
        return NextResponse.json(
          { error: 'Клиент с таким номером телефона уже существует' },
          { status: 409 }
        );
      }
    }

    // Проверяем уникальность telegram_id (если он изменился)
    if (telegramId && telegramId !== existingClient.telegramId) {
      const telegramExists = await prisma.client.findUnique({
        where: { telegramId }
      });

      if (telegramExists) {
        return NextResponse.json(
          { error: 'Клиент с таким Telegram ID уже существует' },
          { status: 409 }
        );
      }
    }

    // Если обновляется фото и у клиента уже есть фото, удаляем старое из S3
    if (photoUrl && existingClient.photoUrl && existingClient.photoUrl !== photoUrl) {
      try {
        // Проверяем, что старое фото находится в нашем S3
        if (existingClient.photoUrl.includes('s3.twcstorage.ru')) {
          await deleteFromS3(existingClient.photoUrl);
        }
      } catch (error) {
        console.error('Ошибка при удалении старого фото из S3:', error);
        // Не прерываем обновление клиента из-за ошибки удаления фото
      }
    }

    // Обновляем клиента
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        fullName,
        phone,
        photoUrl,
        telegramId,
        tariffId: tariffId ? parseInt(tariffId) : null
      },
      include: {
        tariff: true,
        subscriptions: {
          include: {
            tariff: true
          }
        }
      }
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Ошибка при обновлении клиента:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении клиента' },
      { status: 500 }
    );
  }
}

// DELETE - удалить клиента
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = parseInt((await params).id);

    // Проверяем существование клиента
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Удаляем клиента (каскадное удаление настроено в схеме)
    await prisma.client.delete({
      where: { id: clientId }
    });

    return NextResponse.json({ message: 'Клиент успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении клиента:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении клиента' },
      { status: 500 }
    );
  }
}
