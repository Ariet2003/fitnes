import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateQRCode } from '@/lib/qr';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Неверный ID клиента' },
        { status: 400 }
      );
    }

    const qrUrl = await getOrCreateQRCode(clientId);

    return NextResponse.json({ qrUrl });
  } catch (error) {
    console.error('Ошибка при получении QR-кода:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
