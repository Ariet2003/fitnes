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
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const controlsRef = useRef<any>();

  // Инициализация сканера
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      stopScanning();
    };
  }, []);

  // Управление сканированием в зависимости от isEnabled и готовности компонента
  useEffect(() => {
    if (isEnabled && codeReader.current && !isScanning && !isMinimized && videoRef.current) {
      startScanning();
    } else if (!isEnabled && isScanning) {
      stopScanning();
    }
  }, [isEnabled, isScanning, isMinimized]);

  // Запуск сканирования при разворачивании компонента
  useEffect(() => {
    if (!isMinimized && isEnabled && codeReader.current && !isScanning) {
      // Небольшая задержка для рендеринга video элемента
      const timer = setTimeout(() => {
        if (videoRef.current) {
          console.log('🚀 Запуск сканирования после разворачивания...');
          startScanning();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMinimized, isEnabled]);

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
      pauseScanning();
    }
  }, [lastScanned, cooldown, onScanResult]);

  const startScanning = async () => {
    console.log('🎥 Попытка запуска сканера...', {
      isEnabled,
      isMinimized,
      isScanning,
      hasVideoRef: !!videoRef.current,
      hasCodeReader: !!codeReader.current
    });
    
    if (!codeReader.current) {
      console.error('❌ CodeReader не инициализирован');
      setError('Ошибка инициализации сканера');
      return;
    }
    
    if (isMinimized) {
      console.warn('⚠️ Сканер свернут, пропускаем запуск');
      return;
    }
    
    if (!videoRef.current) {
      console.error('❌ Video элемент не найден', {
        isMinimized,
        videoRef: videoRef.current
      });
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
      
      // Запускаем сканирование
      console.log('🔍 Запуск сканирования...');
      controlsRef.current = await codeReader.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
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
    } catch (error) {
      console.error('❌ Ошибка запуска сканера:', error);
      setHasPermission(false);
      
      // Более детальные сообщения об ошибках
      if (error.name === 'NotAllowedError') {
        setError('Доступ к камере запрещен. Разрешите доступ в настройках браузера');
      } else if (error.name === 'NotFoundError') {
        setError('Камера не найдена. Проверьте подключение камеры');
      } else if (error.name === 'NotSupportedError') {
        setError('Камера не поддерживается вашим браузером');
      } else if (error.message) {
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
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeScanning = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPaused(false);
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
              }}
              className="w-16 h-16 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
              title="Развернуть QR-сканер"
            >
              <Camera className="w-6 h-6" />
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
                      console.log('📦 Сворачивание QR-сканера...');
                      setIsMinimized(true);
                      if (isScanning) {
                        pauseScanning();
                      }
                    }}
                    className="p-1 text-gray-300 hover:text-white transition-colors"
                    title="Свернуть"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Видео */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-48 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                
                {/* Overlay для рамки сканирования */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-green-500 border-dashed rounded-lg bg-green-500 bg-opacity-10">
                    <div className="w-full h-full border border-green-300 rounded-lg"></div>
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
