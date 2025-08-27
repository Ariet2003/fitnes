import QRCode from 'qrcode';
import { uploadToS3, deleteFromS3 } from './s3';
import { prisma } from './prisma';

/**
 * Генерирует QR-код для пользователя и загружает его в S3
 * @param telegramId - ID пользователя в Telegram
 * @param clientId - ID клиента в базе данных
 * @returns URL QR-кода в S3
 */
export async function generateAndUploadQRCode(telegramId: string, clientId: number): Promise<string> {
  try {
    // Генерируем QR-код в виде буфера
    const qrBuffer = await QRCode.toBuffer(telegramId, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Генерируем уникальное имя файла
    const fileName = `qr-${clientId}-${Date.now()}.png`;

    // Загружаем QR-код в S3
    const qrUrl = await uploadToS3(qrBuffer, fileName, 'image/png', 'qr-codes');

    console.log(`✅ QR-код для пользователя ${telegramId} загружен: ${qrUrl}`);
    
    return qrUrl;
  } catch (error) {
    console.error('Ошибка при генерации QR-кода:', error);
    throw new Error('Ошибка при генерации QR-кода');
  }
}

/**
 * Получает или создает QR-код для клиента
 * @param clientId - ID клиента в базе данных
 * @returns URL QR-кода в S3
 */
export async function getOrCreateQRCode(clientId: number): Promise<string> {
  try {
    // Получаем данные клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new Error('Клиент не найден');
    }

    if (!client.telegramId) {
      throw new Error('У клиента не указан Telegram ID');
    }

    // Если QR-код уже есть и это не дефолтное значение, возвращаем его
    if (client.qrCode && client.qrCode !== 'qr') {
      return client.qrCode;
    }

    // Генерируем новый QR-код
    const qrUrl = await generateAndUploadQRCode(client.telegramId, clientId);

    // Обновляем запись в базе данных
    await prisma.client.update({
      where: { id: clientId },
      data: { qrCode: qrUrl }
    });

    return qrUrl;
  } catch (error) {
    console.error('Ошибка при получении QR-кода:', error);
    throw error;
  }
}

/**
 * Удаляет QR-код клиента из S3 и базы данных
 * @param clientId - ID клиента в базе данных
 */
export async function deleteQRCode(clientId: number): Promise<void> {
  try {
    // Получаем данные клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || !client.qrCode || client.qrCode === 'qr') {
      return; // Нет QR-кода для удаления
    }

    // Удаляем QR-код из S3
    await deleteFromS3(client.qrCode);

    // Обновляем запись в базе данных
    await prisma.client.update({
      where: { id: clientId },
      data: { qrCode: 'qr' }
    });

    console.log(`🗑️ QR-код для клиента ${clientId} удален`);
  } catch (error) {
    console.error('Ошибка при удалении QR-кода:', error);
    throw error;
  }
}

/**
 * Регенерирует QR-код для клиента (при изменении telegramId)
 * @param clientId - ID клиента в базе данных
 * @param newTelegramId - Новый Telegram ID
 * @returns URL нового QR-кода в S3
 */
export async function regenerateQRCode(clientId: number, newTelegramId: string): Promise<string> {
  try {
    // Сначала удаляем старый QR-код
    await deleteQRCode(clientId);

    // Генерируем новый QR-код
    const qrUrl = await generateAndUploadQRCode(newTelegramId, clientId);

    // Обновляем запись в базе данных
    await prisma.client.update({
      where: { id: clientId },
      data: { 
        qrCode: qrUrl,
        telegramId: newTelegramId
      }
    });

    console.log(`🔄 QR-код для клиента ${clientId} регенерирован`);
    
    return qrUrl;
  } catch (error) {
    console.error('Ошибка при регенерации QR-кода:', error);
    throw error;
  }
}
