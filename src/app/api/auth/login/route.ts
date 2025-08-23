import { NextRequest, NextResponse } from 'next/server';
import { 
  getAdminCredentials, 
  verifyPassword, 
  generateCode, 
  sendTelegramCode, 
  getAdminTelegramId,
  createVerificationToken,
  verifyVerificationToken,
  canResendCode
} from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие переменных окружения
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Ошибка конфигурации сервера' },
        { status: 500 }
      );
    }

    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Получаем данные админа из БД
    const adminCredentials = await getAdminCredentials();
    
    if (!adminCredentials) {
      return NextResponse.json(
        { error: 'Ошибка системы авторизации' },
        { status: 500 }
      );
    }

    // Проверяем логин
    if (login !== adminCredentials.login) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await verifyPassword(password, adminCredentials.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем, есть ли активный токен и можно ли переотправить
    const cookieStore = await cookies();
    const existingToken = cookieStore.get('verification_token')?.value;
    
    if (existingToken) {
      const existingData = verifyVerificationToken(existingToken);
      
      if (existingData && existingData.lastSentAt && !canResendCode(existingData.lastSentAt)) {
        const timeLeft = Math.ceil((existingData.lastSentAt + 2 * 60 * 1000 - Date.now()) / 1000);
        return NextResponse.json(
          { error: `Переотправить код можно через ${timeLeft} секунд` },
          { status: 429 }
        );
      }
    }

    // Генерируем код и отправляем в Telegram
    const code = generateCode();
    const telegramId = await getAdminTelegramId();

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID не найден' },
        { status: 500 }
      );
    }

    const codeSent = await sendTelegramCode(telegramId, code);

    if (!codeSent) {
      return NextResponse.json(
        { error: 'Ошибка отправки кода' },
        { status: 500 }
      );
    }

    // Создаем JWT токен с кодом
    const verificationToken = createVerificationToken(code);
    
    cookieStore.set('verification_token', verificationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300, // 5 минут
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Код отправлен в Telegram',
      canResendIn: 120 // 2 минуты в секундах
    });

  } catch (error) {
    console.error('Ошибка в API login:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
