import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface AdminCredentials {
  login: string;
  password: string;
}

export async function getAdminCredentials(): Promise<AdminCredentials | null> {
  try {
    // Проверяем подключение к базе данных
    await prisma.$connect();
    
    const setting = await prisma.setting.findUnique({
      where: { key: 'admin' }
    });

    if (!setting) {
      console.warn('Настройки админа не найдены в базе данных');
      return null;
    }

    try {
      const credentials = JSON.parse(setting.value) as AdminCredentials;
      return credentials;
    } catch (parseError) {
      console.error('Ошибка парсинга данных админа:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Ошибка получения данных админа:', error);
    if (error instanceof Error) {
      console.error('Детали ошибки:', error.message);
      console.error('Стек ошибки:', error.stack);
    }
    return null;
  } finally {
    // Отключаемся от базы данных
    await prisma.$disconnect();
  }
}

export async function getAdminTelegramId(): Promise<string | null> {
  try {
    await prisma.$connect();
    
    const setting = await prisma.setting.findUnique({
      where: { key: 'admin_telegram' }
    });

    if (!setting) {
      console.warn('Telegram ID админа не найден в базе данных');
      return null;
    }

    return setting.value;
  } catch (error) {
    console.error('Ошибка получения Telegram ID:', error);
    if (error instanceof Error) {
      console.error('Детали ошибки:', error.message);
      console.error('Стек ошибки:', error.stack);
    }
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt-fitness-app-2024';

export interface VerificationData {
  code: string;
  expiresAt: number;
  lastSentAt?: number;
}

export interface SessionData {
  userId: string;
  login: string;
  createdAt: number;
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createVerificationToken(code: string): string {
  const payload: VerificationData = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
    lastSentAt: Date.now()
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
}

export function verifyVerificationToken(token: string): VerificationData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as VerificationData;
    
    // Проверяем, не истек ли токен
    if (Date.now() > decoded.expiresAt) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

export function createSessionToken(login: string): string {
  console.log('[AUTH] Создаем токен сессии для:', login);
  console.log('[AUTH] JWT_SECRET (первые 10 символов):', JWT_SECRET.substring(0, 10));
  
  const payload: SessionData = {
    userId: 'admin',
    login,
    createdAt: Date.now()
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  console.log('[AUTH] Токен создан (первые 20 символов):', token.substring(0, 20));
  
  return token;
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    console.log('[AUTH] Проверяем токен сессии');
    const decoded = jwt.verify(token, JWT_SECRET) as SessionData;
    console.log('[AUTH] Токен валидный:', decoded);
    return decoded;
  } catch (error) {
    console.error('[AUTH] Ошибка проверки токена:', error);
    return null;
  }
}

export function canResendCode(lastSentAt: number): boolean {
  const twoMinutes = 2 * 60 * 1000;
  return Date.now() - lastSentAt >= twoMinutes;
}

export async function getBotToken(): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'admin_bot_token' }
    });

    return setting ? setting.value : null;
  } catch (error) {
    console.error('Ошибка получения токена бота:', error);
    return null;
  }
}

export async function sendTelegramCode(telegramId: string, code: string): Promise<boolean> {
  try {
    const botToken = await getBotToken();
    
    if (!botToken) {
      console.error('Токен бота не найден в базе данных');
      return false;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: `🔐 *Код авторизации*\n\n` +
              `Ваш код для входа в систему управления фитнес-клубом:\n\n` +
              `\`${code}\`\n\n` +
              `⏱ Код действителен в течение 5 минут\n` +
              `🔒 Никому не сообщайте этот код\n\n` +
              `_Если вы не пытались войти в систему, проигнорируйте это сообщение_`,
        parse_mode: 'Markdown'
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
    return false;
  }
}
