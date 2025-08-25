import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, generateFileName, deleteFromS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const files = formData.getAll('files') as File[];
    const folder = formData.get('folder') as string || 'clients';

    // Поддержка как множественных, так и одиночных файлов
    const singleFile = formData.get('file') as File;
    const filesToProcess = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    console.log(`📤 Загрузка ${filesToProcess.length} файл(ов) в папку "${folder}"`);

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Файлы не найдены' },
        { status: 400 }
      );
    }

    // Ограничение на количество файлов (максимум 10)
    if (filesToProcess.length > 10) {
      return NextResponse.json(
        { error: 'Максимум можно загрузить 10 файлов одновременно' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of filesToProcess) {
      if (!file) continue;

      console.log(`📁 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Проверяем тип файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Неподдерживаемый тип файла ${file.name}. Разрешены: JPEG, PNG, WebP, GIF` },
          { status: 400 }
        );
      }

      // Проверяем размер файла (максимум 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Размер файла ${file.name} не должен превышать 5MB` },
          { status: 400 }
        );
      }

      // Конвертируем файл в буфер
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Генерируем уникальное имя файла
      const fileName = generateFileName(file.name);

      // Загружаем в S3
      try {
        const fileUrl = await uploadToS3(buffer, fileName, file.type, folder);
        console.log(`✅ ${file.name} → ${fileUrl}`);

        uploadedFiles.push({
          url: fileUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          type: file.type
        });
      } catch (s3Error) {
        console.error(`❌ Ошибка загрузки ${file.name}:`, s3Error);
        throw new Error(`Ошибка загрузки файла ${file.name} в S3: ${s3Error instanceof Error ? s3Error.message : 'Неизвестная ошибка'}`);
      }
    }

    // Возвращаем результат в формате, совместимом с клиентами
    if (uploadedFiles.length === 1) {
      // Для одиночного файла (как AddClientModal)
      return NextResponse.json({
        success: true,
        url: uploadedFiles[0].url,
        fileName: uploadedFiles[0].fileName,
        originalName: uploadedFiles[0].originalName,
        size: uploadedFiles[0].size,
        type: uploadedFiles[0].type
      });
    } else {
      // Для множественных файлов
      return NextResponse.json({
        success: true,
        files: uploadedFiles,
        count: uploadedFiles.length
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при загрузке файла:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при загрузке файла' },
      { status: 500 }
    );
  }
}

// DELETE /api/upload - удаление файла из S3
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'URL файла не указан' },
        { status: 400 }
      );
    }

    await deleteFromS3(fileUrl);

    return NextResponse.json({
      success: true,
      message: 'Файл успешно удален'
    });

  } catch (error) {
    console.error('❌ Ошибка при удалении файла:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при удалении файла' },
      { status: 500 }
    );
  }
}
