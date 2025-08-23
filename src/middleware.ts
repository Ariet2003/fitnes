import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidSessionToken } from '@/lib/auth-edge';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Получаем токен сессии
  const sessionToken = request.cookies.get('admin_session')?.value;
  console.log('[MIDDLEWARE] Сырой токен:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'отсутствует');
  
  const isAuthenticated = sessionToken ? isValidSessionToken(sessionToken) : false;

  console.log('[MIDDLEWARE] Путь:', pathname, 'Токен:', !!sessionToken, 'Авторизован:', isAuthenticated);

  // Защищенные роуты
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      console.log('[MIDDLEWARE] Неавторизованный доступ к дашборду, редирект на /');
      return NextResponse.redirect(new URL('/', request.url));
    }
    console.log('[MIDDLEWARE] Авторизованный доступ к дашборду');
    return NextResponse.next();
  }

  // Редирект с главной если авторизован
  if (pathname === '/') {
    if (isAuthenticated) {
      console.log('[MIDDLEWARE] Авторизован на главной, редирект на дашборд');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log('[MIDDLEWARE] Неавторизован на главной');
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