import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const data = await request.json();
    const { phone, address, socialLinks, mapLink } = data;

    // Валидация данных
    if (!phone || !address) {
      return NextResponse.json(
        { error: 'Телефон и адрес обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Валидация социальных сетей
    let validatedSocialLinks = {};
    if (socialLinks) {
      if (typeof socialLinks === 'string') {
        try {
          validatedSocialLinks = JSON.parse(socialLinks);
        } catch (e) {
          return NextResponse.json(
            { error: 'Неверный формат социальных сетей' },
            { status: 400 }
          );
        }
      } else {
        validatedSocialLinks = socialLinks;
      }
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        phone,
        address,
        socialLinks: validatedSocialLinks,
        mapLink: mapLink || ''
      }
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Ошибка обновления контакта:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления контакта' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    await prisma.contact.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления контакта:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления контакта' },
      { status: 500 }
    );
  }
}
