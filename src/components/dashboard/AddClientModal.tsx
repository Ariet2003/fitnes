'use client';

import { useState, useRef, useCallback } from 'react';
import { X, User, Phone, MessageCircle, CreditCard, Camera } from 'lucide-react';
import Image from 'next/image';
import ImageModal from '../ui/ImageModal';
// Динамический импорт для избежания проблем с SSR

interface Tariff {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  duration: number; // срок действия в месяцах
  freezeLimit: number;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  tariffs: Tariff[];
  onClientAdded: () => void;
}

export default function AddClientModal({ isOpen, onClose, tariffs, onClientAdded }: AddClientModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    telegramId: '',
    tariffId: '',
    photoUrl: '',
    startDate: new Date().toISOString().split('T')[0] // сегодняшняя дата по умолчанию
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [phoneValidating, setPhoneValidating] = useState(false);
  const [telegramValidating, setTelegramValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const telegramTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [showImageModal, setShowImageModal] = useState(false);

  // Типы для поддержки старых API камеры
  interface NavigatorWithDeprecatedMediaAPI extends Navigator {
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    msGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Функции для быстрого выбора даты
  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData(prev => ({ ...prev, startDate: date.toISOString().split('T')[0] }));
  };

  const getSelectedTariff = () => {
    return formData.tariffId ? tariffs.find(t => t.id === parseInt(formData.tariffId)) : null;
  };

  const calculateEndDate = () => {
    const selectedTariff = getSelectedTariff();
    if (!selectedTariff || !formData.startDate) return '';
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + selectedTariff.durationDays);
    
    return endDate.toLocaleDateString('ru-RU');
  };

  // Проверка уникальности телефона
  const checkPhoneUniqueness = useCallback(async (phone: string) => {
    if (!phone || phone.length < 7) return;
    
    setPhoneValidating(true);
    try {
      const response = await fetch(`/api/clients/check-phone?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      
      if (!response.ok) {
        setPhoneError(data.error);
      } else {
        setPhoneError('');
      }
    } catch (error) {
      setPhoneError('Ошибка проверки номера');
    } finally {
      setPhoneValidating(false);
    }
  }, []);

  // Проверка уникальности Telegram ID
  const checkTelegramUniqueness = useCallback(async (telegramId: string) => {
    if (!telegramId.trim()) return;
    
    setTelegramValidating(true);
    try {
      const response = await fetch(`/api/clients/check-telegram?telegramId=${encodeURIComponent(telegramId)}`);
      const data = await response.json();
      
      if (!response.ok) {
        setTelegramError(data.error);
      } else {
        setTelegramError('');
      }
    } catch (error) {
      setTelegramError('Ошибка проверки Telegram ID');
    } finally {
      setTelegramValidating(false);
    }
  }, []);

  // Определение мобильного устройства
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Проверка поддержки камеры
  const checkCameraSupport = () => {
    // Современный способ
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return true;
    }
    
    // Fallback для старых браузеров
    const nav = navigator as NavigatorWithDeprecatedMediaAPI;
    const getUserMedia = nav.getUserMedia || 
                        nav.webkitGetUserMedia || 
                        nav.mozGetUserMedia || 
                        nav.msGetUserMedia;
    
    return !!getUserMedia;
  };

  // Получение getUserMedia с fallback
  const getUserMediaCompat = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    // Современный способ
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    
    // Fallback для старых браузеров
    const nav = navigator as NavigatorWithDeprecatedMediaAPI;
    const getUserMedia = nav.getUserMedia || 
                        nav.webkitGetUserMedia || 
                        nav.mozGetUserMedia || 
                        nav.msGetUserMedia;
    
    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia не поддерживается'));
    }
    
    return new Promise((resolve, reject) => {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };

  // Открытие камеры
  const openCamera = async () => {
    try {
      // Проверяем поддержку getUserMedia с fallback
      if (!checkCameraSupport()) {
        throw new Error('Камера не поддерживается в данном браузере');
      }

      // Настройки камеры для мобильных и десктопов
      const facingMode = isMobile() ? currentFacingMode : 'user';
      const constraints = {
        video: {
          facingMode: { exact: facingMode },
          width: { 
            min: 320,
            ideal: isMobile() ? 720 : 640,
            max: 1920 
          },
          height: { 
            min: 240,
            ideal: isMobile() ? 1280 : 480,
            max: 1080 
          },
          aspectRatio: isMobile() ? { ideal: 9/16 } : { ideal: 4/3 }
        },
        audio: false
      };

      // Попытка получить доступ к камере
      let mediaStream;
      try {
        mediaStream = await getUserMediaCompat(constraints);
      } catch (err) {
        // Если не удалось с заданными параметрами, пробуем базовые настройки
        console.warn('Не удалось использовать предпочтительные настройки камеры, использую базовые');
        try {
          mediaStream = await getUserMediaCompat({
            video: {
              facingMode: 'user'
            },
            audio: false
          });
        } catch (basicErr) {
          // Последняя попытка с минимальными настройками
          console.warn('Пробую минимальные настройки камеры');
          mediaStream = await getUserMediaCompat({
            video: true,
            audio: false
          });
        }
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
      // Устанавливаем поток после рендера с дополнительной задержкой для мобильных
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          
          // Для мобильных устройств дополнительно настраиваем воспроизведение
          if (isMobile()) {
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            videoRef.current.muted = true;
          }
        }
      }, isMobile() ? 300 : 100);
      
    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      
      let errorMessage = 'Не удалось получить доступ к камере.';
      
      // Проверяем HTTPS
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorMessage = 'Камера доступна только через HTTPS соединение. Пожалуйста, используйте безопасное соединение.';
      } else if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Доступ к камере запрещен. Пожалуйста, разрешите доступ к камере в настройках браузера.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Камера не найдена. Проверьте подключение камеры.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Камера не поддерживается на этом устройстве.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Настройки камеры не поддерживаются. Попробуйте другую камеру.';
        } else if (error.message.includes('getUserMedia')) {
          errorMessage = 'Камера не поддерживается в данном браузере. Попробуйте обновить браузер.';
        }
      }
      
      setError(errorMessage);
      
      // Автоматически предлагаем загрузку файла
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 2000);
    }
  };

  // Переключение камеры (только для мобильных)
  const switchCamera = async () => {
    if (!isMobile()) return;
    
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(newFacingMode);
    
    // Закрываем текущий поток
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Открываем камеру с новым режимом
    setTimeout(() => {
      openCamera();
    }, 100);
  };

  // Закрытие камеры
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCurrentFacingMode('user'); // Сбрасываем на переднюю камеру
  };

  // Снятие фото
  const takePhoto = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        setError('Ошибка: элементы камеры не найдены');
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Проверяем, что видео загружено
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Видео еще не загружено. Попробуйте еще раз.');
        return;
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Не удалось получить контекст canvas');
        return;
      }
      
      // Устанавливаем размеры canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Рисуем изображение с видео на canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Получаем данные изображения
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      if (imageData && imageData !== 'data:,') {
        setPreviewUrl(imageData);
        
        // Загружаем в S3
        try {
          setLoading(true);
          
          // Конвертируем dataURL в Blob
          const response = await fetch(imageData);
          const blob = await response.blob();
          
          // Создаем File объект
          const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Загружаем в S3
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await uploadResponse.json();

          if (!uploadResponse.ok) {
            throw new Error(data.error || 'Ошибка при загрузке фото');
          }

          // Сохраняем URL из S3
          setFormData(prev => ({ ...prev, photoUrl: data.url }));
          
        } catch (uploadError) {
          console.error('Ошибка загрузки фото в S3:', uploadError);
          setError(uploadError instanceof Error ? uploadError.message : 'Ошибка при загрузке фото');
        } finally {
          setLoading(false);
        }
        
        closeCamera();
      } else {
        setError('Не удалось сделать фото. Попробуйте еще раз.');
      }
      
    } catch (error) {
      console.error('Ошибка при съемке фото:', error);
      setError('Произошла ошибка при съемке фото');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        setError('');

        // Создаем preview локально
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Загружаем файл в S3
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Ошибка при загрузке файла');
        }

        // Сохраняем URL из S3
        setFormData(prev => ({ ...prev, photoUrl: data.url }));

      } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        setError(error instanceof Error ? error.message : 'Ошибка при загрузке файла');
        setPreviewUrl('');
        setFormData(prev => ({ ...prev, photoUrl: '' }));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Валидация
      if (!formData.fullName.trim()) {
        throw new Error('ФИО обязательно для заполнения');
      }
      if (!formData.phone.trim()) {
        throw new Error('Номер телефона обязателен для заполнения');
      }

      // Валидация телефона
      const isValidPhone = await validatePhoneNumber(formData.phone);
      if (!isValidPhone) {
        throw new Error('Некорректный номер телефона');
      }

      // Проверяем наличие ошибок валидации
      if (phoneError || telegramError) {
        throw new Error('Исправьте ошибки в форме');
      }

      // Очищаем все таймеры перед отправкой
      if (phoneTimeoutRef.current) {
        clearTimeout(phoneTimeoutRef.current);
      }
      if (telegramTimeoutRef.current) {
        clearTimeout(telegramTimeoutRef.current);
      }

      const dataToSend = {
        ...formData,
        phone: formData.phone,
        tariffId: formData.tariffId || null
      };
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при создании клиента');
      }

      // Сброс формы и закрытие модального окна
      setFormData({
        fullName: '',
        phone: '',
        telegramId: '',
        tariffId: '',
        photoUrl: '',
        startDate: new Date().toISOString().split('T')[0]
      });
      setPreviewUrl('');
      setPhoneError('');
      setTelegramError('');
      closeCamera();
      onClientAdded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneInput = async (value: string) => {
    try {
      // Убираем все нецифровые символы кроме +
      let cleaned = value.replace(/[^\d+]/g, '');
      
      // Если начинается с 8, заменяем на +7
      if (cleaned.startsWith('8')) {
        cleaned = `+7${cleaned.slice(1)}`;
      }
      
      // Если начинается с 7, добавляем +
      if (cleaned.startsWith('7') && !cleaned.startsWith('+7')) {
        cleaned = `+${cleaned}`;
      }
      
      // Если не начинается с +, добавляем +
      if (!cleaned.startsWith('+') && cleaned.length > 0) {
        cleaned = `+${cleaned}`;
      }
      
      // Пытаемся распарсить и отформатировать номер
      if (cleaned.length > 4) {
        try {
          const { parsePhoneNumber } = await import('libphonenumber-js/max');
          const phoneNumber = parsePhoneNumber(cleaned);
          if (phoneNumber) {
            return phoneNumber.formatInternational();
          }
        } catch (error) {
          // Если не удалось распарсить, возвращаем как есть
        }
      }
      
      return cleaned;
    } catch (error) {
      return value;
    }
  };

  const validatePhoneNumber = async (phone: string): Promise<boolean> => {
    try {
      const { isValidPhoneNumber } = await import('libphonenumber-js/max');
      return isValidPhoneNumber(phone);
    } catch (error) {
      // Простая валидация как fallback
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.length >= 7 && cleaned.length <= 15;
    }
  };

  const handlePhoneChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = await formatPhoneInput(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    setPhoneError('');
    
    // Очищаем предыдущий таймер
    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }
    
    // Валидация телефона
    if (formatted.length > 4) {
      const isValid = await validatePhoneNumber(formatted);
      if (!isValid) {
        setPhoneError('Некорректный номер телефона');
        return;
      }
      
      // Проверка уникальности с сокращенной задержкой
      phoneTimeoutRef.current = setTimeout(() => {
        checkPhoneUniqueness(formatted);
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTelegramChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, telegramId: value }));
    setTelegramError('');
    
    // Очищаем предыдущий таймер
    if (telegramTimeoutRef.current) {
      clearTimeout(telegramTimeoutRef.current);
    }
    
    // Проверка уникальности с сокращенной задержкой
    if (value.trim()) {
      telegramTimeoutRef.current = setTimeout(() => {
        checkTelegramUniqueness(value);
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Очистка таймеров при закрытии
  const handleClose = () => {
    if (phoneTimeoutRef.current) {
      clearTimeout(phoneTimeoutRef.current);
    }
    if (telegramTimeoutRef.current) {
      clearTimeout(telegramTimeoutRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Добавить клиента</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Photo Upload */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={60}
                  height={60}
                  className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowImageModal(true)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center"
                style={{ display: previewUrl ? 'none' : 'flex' }}
              >
                <User className="w-6 h-6 text-gray-400" />
              </div>
                              <button
                  type="button"
                  onClick={openCamera}
                  disabled={!checkCameraSupport()}
                  className={`absolute -bottom-1 -right-1 p-1.5 rounded-full text-white transition-colors ${
                    checkCameraSupport() 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-500 cursor-not-allowed'
                  }`}
                  title={checkCameraSupport() ? 'Сделать фото с камеры' : 'Камера недоступна'}
                >
                  <Camera className="w-3 h-3" />
                </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Фото клиента</p>
              <p className="text-xs text-gray-400">Нажмите на камеру для съемки</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                или выберите файл
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ФИО *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Введите ФИО клиента"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Номер телефона *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="+1 (555) 123-4567"
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors ${
                  phoneError 
                    ? 'border-red-500 focus:border-red-500' 
                    : phoneValidating
                    ? 'border-yellow-500 focus:border-yellow-500'
                    : 'border-gray-600 focus:border-blue-500'
                }`}
                required
              />
              {phoneValidating && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                </div>
              )}
            </div>
            {phoneError && (
              <p className="text-red-400 text-xs mt-1">{phoneError}</p>
            )}
          </div>

          {/* Telegram ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Telegram ID
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="telegramId"
                value={formData.telegramId}
                onChange={handleTelegramChange}
                placeholder="@username или user_id"
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors ${
                  telegramError 
                    ? 'border-red-500 focus:border-red-500' 
                    : telegramValidating
                    ? 'border-yellow-500 focus:border-yellow-500'
                    : 'border-gray-600 focus:border-blue-500'
                }`}
              />
              {telegramValidating && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                </div>
              )}
            </div>
            {telegramError && (
              <p className="text-red-400 text-xs mt-1">{telegramError}</p>
            )}
          </div>

          {/* Tariff */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Тариф
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                name="tariffId"
                value={formData.tariffId}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Выберите тариф</option>
                {tariffs.map(tariff => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name} - ₽{tariff.price} | {tariff.durationDays} дней | {tariff.duration} мес. | {tariff.freezeLimit} заморозок
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date - показываем только если выбран тариф */}
          {formData.tariffId && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Дата начала абонемента
              </label>
              
              {/* Быстрые кнопки выбора даты */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Завтра
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  +7 дней
                </button>
              </div>

              {/* Календарь выбора даты */}
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />

              {/* Показ рассчитанной даты окончания */}
              {calculateEndDate() && (
                <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <p className="text-green-300 text-sm">
                    <span className="font-medium">Дата окончания:</span> {calculateEndDate()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                closeCamera();
                setPhoneError('');
                setTelegramError('');
                setError('');
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      {/* Скрытые элементы */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Модальное окно камеры */}
      {showCamera && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
          <div className={`${isMobile() 
            ? 'w-full h-full flex flex-col' 
            : 'bg-gray-800 rounded-2xl p-6 w-full max-w-md'
          }`}>
            <div className={`flex items-center justify-between ${isMobile() ? 'p-4 bg-black bg-opacity-50' : 'mb-4'}`}>
              <h3 className="text-lg font-semibold text-white">
                {isMobile() 
                  ? `Камера: ${currentFacingMode === 'user' ? 'Передняя' : 'Задняя'}`
                  : 'Сделать фото'
                }
              </h3>
              <button
                onClick={closeCamera}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className={`relative ${isMobile() ? 'flex-1 flex items-center justify-center' : ''}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`${isMobile() 
                  ? 'w-full h-full object-cover' 
                  : 'w-full rounded-lg max-h-96 object-cover'
                }`}
                style={{ 
                  transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'none' 
                }}
                onLoadedMetadata={() => {
                  // Видео готово к использованию
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                }}
              />
              
              {/* Кнопка переключения камеры для мобильных */}
              {isMobile() && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="absolute top-4 right-4 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                  title="Переключить камеру"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className={`flex ${isMobile() ? 'p-6 bg-black bg-opacity-50' : 'justify-center mt-4'} ${isMobile() ? 'justify-around' : 'space-x-3'}`}>
              <button
                onClick={takePhoto}
                className={`${isMobile() 
                  ? 'w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg' 
                  : 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center'
                }`}
              >
                <Camera className={`${isMobile() ? 'w-8 h-8 text-gray-800' : 'w-4 h-4 mr-2'}`} />
                {!isMobile() && 'Сделать фото'}
              </button>
              
              {isMobile() && (
                <button
                  onClick={switchCamera}
                  className="w-12 h-12 bg-gray-600 bg-opacity-70 text-white rounded-full flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={() => {
                  closeCamera();
                  fileInputRef.current?.click();
                }}
                className={`${isMobile() 
                  ? 'w-12 h-12 bg-gray-600 bg-opacity-70 text-white rounded-full flex items-center justify-center' 
                  : 'px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors'
                }`}
              >
                <svg className={`${isMobile() ? 'w-6 h-6' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {!isMobile() && 'Выбрать файл'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для просмотра изображения */}
      {previewUrl && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={previewUrl}
          altText="Предварительный просмотр фото"
          title="Предварительный просмотр фото"
        />
      )}
    </div>
  );
}
