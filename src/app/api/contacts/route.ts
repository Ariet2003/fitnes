import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { id: 'asc' }
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Ошибка получения контактов:', error);
    return NextResponse.json(
      { error: 'Ошибка получения контактов' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const contact = await prisma.contact.create({
      data: {
        phone,
        address,
        socialLinks: validatedSocialLinks,
        mapLink: mapLink || ''
      }
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Ошибка создания контакта:', error);
    return NextResponse.json(
      { error: 'Ошибка создания контакта' },
      { status: 500 }
    );
  }
}
