import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVerificationToken } from '@/lib/auth';
import { createSessionTokenEdge } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    console.log('[VERIFY] Получен код:', code);

    if (!code) {
      return NextResponse.json(
        { error: 'Код обязателен' },
        { status: 400 }
      );
    }

    // Правильная работа с cookies в Next.js 15
    const cookieStore = await cookies();
    const verificationToken = cookieStore.get('verification_token')?.value;
    console.log('[VERIFY] Токен верификации найден:', !!verificationToken);

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Код истек или не найден' },
        { status: 401 }
      );
    }

    const verificationData = verifyVerificationToken(verificationToken);
    console.log('[VERIFY] Данные верификации:', verificationData);
    
    if (!verificationData) {
      return NextResponse.json(
        { error: 'Код истек или невалиден' },
        { status: 401 }
      );
    }

    console.log('[VERIFY] Сравниваем коды:', { received: code, expected: verificationData.code });
    if (code !== verificationData.code) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 401 }
      );
    }

    // Создаем сессионный токен
    const sessionToken = await createSessionTokenEdge('admin');
    console.log('[VERIFY] Сессионный токен создан');

    // Создаем ответ
    const response = NextResponse.json({ 
      success: true,
      message: 'Авторизация успешна',
      redirect: '/dashboard'
    });

    // Устанавливаем куки
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 // 24 часа
    });

    // Удаляем токен верификации
    response.cookies.delete('verification_token');

    console.log('[VERIFY] Куки установлены, отправляем ответ');
    return response;

  } catch (error) {
    console.error('Ошибка в API verify:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}