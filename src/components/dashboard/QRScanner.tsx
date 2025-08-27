'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, Pause, Play } from 'lucide-react';
import QRVisitModal from './QRVisitModal';

interface QRScannerProps {
  isEnabled: boolean;
  onScanResult?: (result: string) => void;
}

interface ScanResult {
  success: boolean;
  error?: string;
  errorType?: string;
  client?: {
    id: number;
    fullName: string;
    phone: string;
    photoUrl?: string | null;
  };
  subscription?: {
    id: number;
    tariffName: string;
    endDate: string;
    remainingDays: number;
  };
  visitTime?: string;
  workingHours?: {
    start: string;
    end: string;
  };
}

export default function QRScanner({ isEnabled, onScanResult }: QRScannerProps) {
  const hiddenVideoRef = useRef<HTMLVideoElement>(null); // Скрытое видео для сканирования
  const previewVideoRef = useRef<HTMLVideoElement>(null); // Видимое видео для предварительного просмотра
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const controlsRef = useRef<any>(null);

  // Инициализация сканера
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      stopScanning();
    };
  }, []);

  // Управление сканированием в зависимости от isEnabled
  useEffect(() => {
    if (isEnabled && codeReader.current && !isScanning) {
      // Запрашиваем разрешение на уведомления
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Разрешение на уведомления:', permission);
        });
      }
      
      // Небольшая задержка для инициализации DOM
      const timer = setTimeout(() => {
        if (hiddenVideoRef.current) {
          console.log('🚀 Запуск фонового сканирования...');
          startScanning();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isEnabled && isScanning) {
      stopScanning();
    }
  }, [isEnabled, isScanning]);

  // Синхронизация видеопотока при разворачивании
  useEffect(() => {
    if (!isMinimized && isScanning) {
      syncVideoStreams();
    }
  }, [isMinimized, isScanning]);

  // Функция для привлечения внимания к вкладке
  const focusTab = useCallback(() => {
    try {
      // 1. Фокусируем окно браузера
      window.focus();
      
      // 2. Показываем уведомление браузера (если разрешено)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('QR-код отсканирован!', {
          body: 'Клиент найден. Требуется подтверждение посещения.',
          icon: '/favicon.ico',
          tag: 'qr-scan',
          requireInteraction: true
        });
      }
      
      // 3. Меняем заголовок вкладки для привлечения внимания
      const originalTitle = document.title;
      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        document.title = blinkCount % 2 === 0 ? '🔴 QR СКАНИРОВАНИЕ!' : originalTitle;
        blinkCount++;
        if (blinkCount >= 10) { // Мигаем 5 раз
          clearInterval(blinkInterval);
          document.title = originalTitle;
        }
      }, 500);
      
      // 4. Воспроизводим звуковой сигнал
      try {
        // Создаем простой звуковой сигнал
        const playNotificationSound = () => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Первый тон
          const oscillator1 = audioContext.createOscillator();
          const gainNode1 = audioContext.createGain();
          oscillator1.connect(gainNode1);
          gainNode1.connect(audioContext.destination);
          oscillator1.frequency.value = 800;
          gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode1.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
          gainNode1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
          oscillator1.start(audioContext.currentTime);
          oscillator1.stop(audioContext.currentTime + 0.2);
          
          // Второй тон (чуть позже)
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = 1000;
          gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
          gainNode2.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.31);
          gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
          oscillator2.start(audioContext.currentTime + 0.3);
          oscillator2.stop(audioContext.currentTime + 0.5);
        };
        
        playNotificationSound();
      } catch (audioError) {
        console.warn('Не удалось воспроизвести звук:', audioError);
        // Альтернативный метод - используем существующий звук браузера
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmY');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch {
          // Если и это не работает, просто игнорируем
        }
      }
      
    } catch (error) {
      console.warn('Ошибка при попытке привлечь внимание:', error);
    }
  }, []);

  const validateAndProcessQR = useCallback(async (telegramId: string) => {
    try {
      // Предотвращаем повторное сканирование того же QR-кода в течение 3 секунд
      if (lastScanned === telegramId || cooldown) {
        return;
      }

      setLastScanned(telegramId);
      setCooldown(true);
      
      // Убираем кулдаун через 3 секунды
      setTimeout(() => {
        setCooldown(false);
        setLastScanned(null);
      }, 3000);

      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId }),
      });

      const result = await response.json();
      setScanResult(result);
      setShowVisitModal(true);

      // Привлекаем внимание к вкладке
      focusTab();

      // Паузим сканирование на время показа модального окна
      pauseScanning();

      if (onScanResult) {
        onScanResult(telegramId);
      }
    } catch (error) {
      console.error('Ошибка при обработке QR-кода:', error);
      setScanResult({
        success: false,
        error: 'Ошибка при обработке QR-кода',
        errorType: 'PROCESSING_ERROR'
      });
      setShowVisitModal(true);
      
      // Привлекаем внимание даже при ошибке
      focusTab();
      
      pauseScanning();
    }
  }, [lastScanned, cooldown, onScanResult, focusTab]);

  const startScanning = async () => {
    console.log('🎥 Попытка запуска сканера...', {
      isEnabled,
      isMinimized,
      isScanning,
      hasHiddenVideoRef: !!hiddenVideoRef.current,
      hasPreviewVideoRef: !!previewVideoRef.current,
      hasCodeReader: !!codeReader.current
    });
    
    if (!codeReader.current) {
      console.error('❌ CodeReader не инициализирован');
      setError('Ошибка инициализации сканера');
      return;
    }
    
    if (!hiddenVideoRef.current) {
      console.error('❌ Скрытый video элемент не найден');
      setError('Ошибка видео элемента');
      return;
    }

    try {
      setError(null);
      setIsInitializing(true);
      console.log('📱 Запрос доступа к камере...');
      
      // Проверяем поддержку медиа устройств
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Ваш браузер не поддерживает доступ к камере');
      }
      
      // Запрашиваем разрешение на камеру
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Задняя камера по умолчанию
        } 
      });
      
      console.log('✅ Доступ к камере получен');
      setHasPermission(true);
      
      // Запускаем сканирование на скрытом видео элементе
      console.log('🔍 Запуск сканирования...');
      controlsRef.current = await codeReader.current.decodeFromVideoDevice(
        null,
        hiddenVideoRef.current,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            console.log('📋 QR Code найден:', scannedText);
            
            // Проверяем, что это похоже на telegram ID (число)
            if (/^\d+$/.test(scannedText)) {
              console.log('✅ Валидный telegram ID:', scannedText);
              validateAndProcessQR(scannedText);
            } else {
              console.log('⚠️ Неподходящий формат QR-кода:', scannedText);
            }
          }
          
          if (error && error.name !== 'NotFoundException') {
            console.warn('⚠️ Ошибка сканирования:', error);
          }
        }
      );
      
      console.log('✅ Сканирование запущено успешно');
      setIsScanning(true);
      setIsPaused(false);
      setIsInitializing(false);
    } catch (error: any) {
      console.error('❌ Ошибка запуска сканера:', error);
      setHasPermission(false);
      
      // Более детальные сообщения об ошибках
      if (error?.name === 'NotAllowedError') {
        setError('Доступ к камере запрещен. Разрешите доступ в настройках браузера');
      } else if (error?.name === 'NotFoundError') {
        setError('Камера не найдена. Проверьте подключение камеры');
      } else if (error?.name === 'NotSupportedError') {
        setError('Камера не поддерживается вашим браузером');
      } else if (error?.message) {
        setError(error.message);
      } else {
        setError('Не удалось получить доступ к камере');
      }
      setIsInitializing(false);
    }
  };

  const stopScanning = () => {
    console.log('🛑 Остановка сканирования...');
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
    setIsPaused(false);
    setIsInitializing(false);
  };

  const pauseScanning = () => {
    console.log('⏸️ Пауза сканирования...');
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.pause();
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
    }
    setIsPaused(true);
  };

  const resumeScanning = () => {
    console.log('▶️ Возобновление сканирования...');
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.play();
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.play();
    }
    setIsPaused(false);
  };

  // Синхронизация видеопотока между скрытым и видимым видео
  const syncVideoStreams = () => {
    if (hiddenVideoRef.current && previewVideoRef.current && hiddenVideoRef.current.srcObject) {
      previewVideoRef.current.srcObject = hiddenVideoRef.current.srcObject;
      previewVideoRef.current.play().catch(console.warn);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      resumeScanning();
    } else {
      pauseScanning();
    }
  };

  const handleMarkVisit = async () => {
    if (!scanResult?.client) return;

    try {
      const response = await fetch('/api/visits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: lastScanned }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Показываем сообщение об успехе
        setScanResult({
          success: true,
          client: scanResult.client,
          subscription: scanResult.subscription
        });
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
          setShowVisitModal(false);
          resumeScanning();
        }, 2000);
      } else {
        // Показываем ошибку
        setScanResult({
          ...scanResult,
          success: false,
          error: result.error || 'Ошибка при записи посещения'
        });
      }
    } catch (error) {
      console.error('Ошибка при записи посещения:', error);
      setScanResult({
        ...scanResult,
        success: false,
        error: 'Ошибка при записи посещения'
      });
    }
  };

  const closeModal = () => {
    setShowVisitModal(false);
    setScanResult(null);
    resumeScanning();
  };

  // Не показываем сканер если он отключен
  if (!isEnabled) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span className="text-sm">Нет доступа к камере</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Компактный QR-сканер */}
      <div className={`fixed bottom-4 right-4 z-40 transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80 h-60'
      }`}>
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {isMinimized ? (
            /* Минимизированное состояние */
            <button
              onClick={() => {
                console.log('📱 Разворачивание QR-сканера...');
                setIsMinimized(false);
                // Синхронизируем видеопоток после разворачивания
                setTimeout(syncVideoStreams, 100);
              }}
              className="w-16 h-16 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
              title="Развернуть QR-сканер"
            >
              <Camera className="w-6 h-6" />
              {isScanning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </button>
          ) : (
            /* Развернутое состояние */
            <>
              {/* Заголовок */}
              <div className="bg-gray-900 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">QR Сканер</span>
                  {isScanning && !isPaused && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={togglePause}
                    className="p-1 text-gray-300 hover:text-white transition-colors"
                    title={isPaused ? 'Возобновить' : 'Приостановить'}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      console.log('📦 Сворачивание QR-сканера (сканирование продолжается в фоне)...');
                      setIsMinimized(true);
                      // НЕ останавливаем сканирование - оно продолжается в фоне
                    }}
                    className="p-1 text-gray-300 hover:text-white transition-colors"
                    title="Свернуть (сканирование продолжится в фоне)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Видео */}
              <div className="relative">
                <video
                  ref={previewVideoRef}
                  className="w-full h-48 object-cover"
                  style={{ transform: 'scaleX(1)' }}
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Overlay для рамки сканирования */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-green-500 border-dashed rounded-lg">
                    {/* Угловые маркеры для лучшей видимости */}
                    <div className="relative w-full h-full">
                      {/* Верхний левый угол */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400"></div>
                      {/* Верхний правый угол */}
                      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400"></div>
                      {/* Нижний левый угол */}
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400"></div>
                      {/* Нижний правый угол */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400"></div>
                    </div>
                  </div>
                </div>

                {/* Статус */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded text-center">
                    {error ? (
                      <span className="text-red-400">{error}</span>
                    ) : isInitializing ? (
                      <span className="text-blue-400 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-1"></div>
                        Инициализация...
                      </span>
                    ) : isPaused ? (
                      <span className="text-yellow-400">Приостановлено</span>
                    ) : isScanning ? (
                      <span className="text-green-400 flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                        Сканирование активно
                      </span>
                    ) : (
                      <span className="text-gray-400">Готов к запуску</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Скрытое видео для фонового сканирования */}
      <video
        ref={hiddenVideoRef}
        style={{ 
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          transform: 'scaleX(1)'
        }}
        autoPlay
        muted
        playsInline
      />

      {/* Модальное окно с информацией о посещении */}
      <QRVisitModal
        isOpen={showVisitModal}
        onClose={closeModal}
        scannedData={scanResult}
        onMarkVisit={handleMarkVisit}
      />
    </>
  );
}
