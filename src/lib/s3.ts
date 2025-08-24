import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Конфигурация S3 клиента
const s3Client = new S3Client({
  endpoint: process.env.S3_URL,
  region: 'auto', // Для совместимых с S3 хранилищ
  credentials: {
    accessKeyId: process.env.PICTURES_TRIAL_TEST_BUCKET_S3_ACCESS_KEY!,
    secretAccessKey: process.env.PICTURES_TRIAL_TEST_BUCKET_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Для кастомных S3-совместимых сервисов
});

const BUCKET_NAME = process.env.PICTURES_TRIAL_TEST_BUCKET!;

/**
 * Загружает файл в S3
 * @param file - Буфер файла
 * @param fileName - Имя файла
 * @param contentType - MIME тип файла
 * @returns URL загруженного файла
 */
export async function uploadToS3(
  file: Buffer, 
  fileName: string, 
  contentType: string
): Promise<string> {
  const key = `clients/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read', // Делаем файл публично доступным
  });

  await s3Client.send(command);
  
  // Возвращаем публичный URL
  return `${process.env.S3_URL}/${BUCKET_NAME}/${key}`;
}

/**
 * Удаляет файл из S3
 * @param fileUrl - URL файла для удаления
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    // Извлекаем ключ из URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(url.pathname.indexOf('/', 1) + 1);
    
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Ошибка при удалении файла из S3:', error);
    throw error;
  }
}

/**
 * Генерирует уникальное имя файла
 * @param originalName - Исходное имя файла
 * @returns Уникальное имя файла
 */
export function generateFileName(originalName: string): string {
  const extension = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomString}.${extension}`;
}
