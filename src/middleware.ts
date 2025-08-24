import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Упрощенная проверка токена для middleware
function isValidToken(token: string): boolean {
  try {
    // Простая проверка структуры JWT токена
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Проверяем, что токен не пустой
    if (!parts[0] || !parts[1] || !parts[2]) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Получаем токен сессии
  const sessionToken = request.cookies.get('admin_session')?.value;
  const isAuthenticated = sessionToken ? isValidToken(sessionToken) : false;

  // Защищенные роуты
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Редирект с главной если авторизован
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Указываем, для каких путей срабатывает middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};