import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  verifyVerificationToken, 
  canResendCode, 
  generateCode, 
  sendTelegramCode, 
  getAdminTelegramId,
  createVerificationToken 
} from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const verificationToken = cookieStore.get('verification_token')?.value;

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Нет активной сессии верификации' },
        { status: 400 }
      );
    }

    const verificationData = verifyVerificationToken(verificationToken);
    
    if (!verificationData) {
      return NextResponse.json(
        { error: 'Сессия верификации истекла' },
        { status: 401 }
      );
    }

    if (verificationData.lastSentAt && !canResendCode(verificationData.lastSentAt)) {
      const timeLeft = Math.ceil((verificationData.lastSentAt + 2 * 60 * 1000 - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Переотправить код можно через ${timeLeft} секунд` },
        { status: 429 }
      );
    }

    // Генерируем новый код
    const newCode = generateCode();
    const telegramId = await getAdminTelegramId();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID не найден' },
        { status: 500 }
      );
    }

    const codeSent = await sendTelegramCode(telegramId, newCode);

    if (!codeSent) {
      return NextResponse.json(
        { error: 'Ошибка отправки кода' },
        { status: 500 }
      );
    }

    // Создаем новый JWT токен с обновленным кодом
    const newVerificationToken = createVerificationToken(newCode);
    
    cookieStore.set('verification_token', newVerificationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300, // 5 минут
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Код отправлен повторно',
      canResendIn: 120
    });

  } catch (error) {
    console.error('Ошибка при повторной отправке кода:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
