import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Удаляем все cookies, связанные с авторизацией
    cookieStore.delete('admin_session');
    cookieStore.delete('verification_token');

    return NextResponse.json({ 
      success: true, 
      message: 'Выход выполнен успешно' 
    });
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 }
    );
  }
}
