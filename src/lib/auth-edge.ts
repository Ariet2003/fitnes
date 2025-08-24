import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-for-jwt-fitness-app-2024'
);

export interface SessionData {
  userId: string;
  login: string;
  createdAt: number;
  [key: string]: unknown;
}

export async function createSessionTokenEdge(login: string): Promise<string> {
  const payload: SessionData = {
    userId: 'admin',
    login,
    createdAt: Date.now()
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function verifySessionTokenEdge(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch (error) {
    console.error('[AUTH-EDGE] Ошибка проверки токена:', error);
    return null;
  }
}

// Функция для декодирования base64 в Edge Runtime
function base64Decode(str: string): string {
  // Добавляем padding если нужно
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  
  // Декодируем base64
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Синхронная версия для middleware (упрощенная проверка)
export function isValidSessionToken(token: string): boolean {
  try {
    // Простая проверка структуры JWT токена
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Декодируем payload без проверки подписи (только для базовой валидации)
    const payload = JSON.parse(base64Decode(parts[1]));
    
    // Проверяем обязательные поля
    if (!payload.userId || !payload.login || !payload.exp) return false;
    
    // Проверяем, не истек ли токен
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return false;
    
    return true;
  } catch (error) {
    console.error('[AUTH-EDGE] Ошибка валидации токена:', error);
    return false;
  }
}
