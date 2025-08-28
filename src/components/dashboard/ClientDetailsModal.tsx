'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MessageCircle, 
  Calendar, 
  CreditCard, 
  Edit3,
  Trash2,
  MessageSquare,
  QrCode,
  Snowflake,
  CheckCircle,
  Clock
} from 'lucide-react';
import Image from 'next/image';
import SubscriptionManagement from './SubscriptionManagement';
import ImageModal from '../ui/ImageModal';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number | null;
  onClientUpdated: () => void;
}

interface ClientDetails {
  id: number;
  fullName: string;
  phone: string;
  photoUrl?: string;
  telegramId?: string;
  status: boolean;
  createdAt: string;
  tariff?: {
    name: string;
    price: number;
  };
  subscriptions: Array<{
    id: number;
    status: string;
    startDate: string;
    endDate: string;
    remainingDays: number;
    freezeUsed: number;
    tariff: {
      name: string;
      price: number;
      freezeLimit: number;
    };
  }>;
  visits: Array<{
    id: number;
    visitDate: string;
    qrCode: string;
    isFreezeDay: boolean;
    subscriptionId: number;
    subscription: {
      tariff: {
        name: string;
      };
    };
  }>;
  feedback: Array<{
    id: number;
    message: string;
    createdAt: string;
  }>;
}

export default function ClientDetailsModal({ 
  isOpen, 
  onClose, 
  clientId, 
  onClientUpdated 
}: ClientDetailsModalProps) {
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'subscriptions' | 'visits' | 'feedback'>('info');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [visitData, setVisitData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    telegramId: '',
    photoUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      loadClientDetails();
    }
  }, [isOpen, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClientDetails = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей клиента:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция handleStatusToggle убрана, так как поле status удалено из модели Client

  const startEditing = () => {
    if (client) {
      setEditForm({
        fullName: client.fullName,
        phone: client.phone,
        telegramId: client.telegramId || '',
        photoUrl: client.photoUrl || ''
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({
      fullName: '',
      phone: '',
      telegramId: '',
      photoUrl: ''
    });
    // Закрываем камеру если она открыта
    if (cameraOpen) {
      closeCamera();
    }
  };

  // Закрываем камеру при закрытии модального окна
  useEffect(() => {
    if (!isOpen && cameraOpen) {
      closeCamera();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Проверяем статус клиента при открытии модального окна
  useEffect(() => {
    if (isOpen && client?.telegramId) {
      checkClientStatus();
      // Также проверяем, не нужно ли завершить абонемент по сроку действия
      checkAndCompleteSubscription();
    }
  }, [isOpen, client?.telegramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Проверяем тип файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, GIF');
        return;
      }

      // Проверяем размер файла (максимум 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      // Загружаем в S3
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

      // Обновляем форму с новым URL
      setEditForm(prev => ({ ...prev, photoUrl: data.url }));

    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const saveChanges = async () => {
    if (!client) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при обновлении клиента');
      }

      const updatedClient = await response.json();
      setClient(updatedClient);
      setIsEditing(false);
      onClientUpdated();

    } catch (error) {
      console.error('Ошибка при обновлении клиента:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при обновлении клиента');
    } finally {
      setLoading(false);
    }
  };

  // Интерфейс для совместимости с устаревшими API
  interface NavigatorWithDeprecatedMediaAPI extends Navigator {
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

  // Проверка поддержки камеры
  const checkCameraSupport = (): boolean => {
    const nav = navigator as NavigatorWithDeprecatedMediaAPI;
    return !!(
      navigator.mediaDevices?.getUserMedia ||
      nav.webkitGetUserMedia ||
      nav.mozGetUserMedia ||
      nav.msGetUserMedia
    );
  };

  // Совместимая функция getUserMedia
  const getUserMediaCompat = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    const nav = navigator as NavigatorWithDeprecatedMediaAPI;
    
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    
    if (nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia) {
      const getUserMedia = nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia;
      return new Promise((resolve, reject) => {
        if (getUserMedia) {
          getUserMedia.call(navigator, constraints, resolve, reject);
        } else {
          reject(new Error('getUserMedia не поддерживается'));
        }
      });
    }
    
    return Promise.reject(new Error('getUserMedia не поддерживается'));
  };

  const openCamera = async () => {
    setCameraError('');
    
    try {
      // Проверяем HTTPS (камера работает только по HTTPS или localhost)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Камера доступна только по HTTPS или на localhost');
      }

      // Проверяем поддержку камеры
      if (!checkCameraSupport()) {
        throw new Error('Камера не поддерживается в данном браузере');
      }

      // Настройки камеры для мобильных и десктопов
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // фронтальная камера
        },
        audio: false
      };

      const mediaStream = await getUserMediaCompat(constraints);
      setStream(mediaStream);
      setCameraOpen(true);

      // Подключаем поток к видео элементу с задержкой для корректной инициализации
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      }, 100);

    } catch (error) {
      let errorMessage = 'Ошибка доступа к камере';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Доступ к камере запрещен. Разрешите использование камеры в настройках браузера.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'Камера не найдена на устройстве.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Камера используется другим приложением.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Камера не поддерживает запрошенные настройки.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setCameraError(errorMessage);
      console.error('Ошибка камеры:', error);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setCameraError('');
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Устанавливаем размеры canvas равными размерам видео
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Рисуем текущий кадр видео на canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Конвертируем canvas в blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          setUploading(true);

          // Создаем File объект из blob
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });

          // Загружаем в S3
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Ошибка при загрузке фото');
          }

          // Обновляем форму с новым URL
          setEditForm(prev => ({ ...prev, photoUrl: data.url }));

          // Закрываем камеру
          closeCamera();

        } catch (error) {
          console.error('Ошибка загрузки фото:', error);
          alert(error instanceof Error ? error.message : 'Ошибка при загрузке фото');
        } finally {
          setUploading(false);
        }
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error('Ошибка при съемке фото:', error);
      alert('Ошибка при съемке фото');
    }
  };

  const handleUnfreezeDay = async (visitId: number, subscriptionId: number) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unfreeze_day',
          visitId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при разморозке дня');
      }

      // Перезагружаем данные клиента
      loadClientDetails();
      onClientUpdated();

    } catch (error) {
      console.error('Ошибка при разморозке дня:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при разморозке дня');
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onClientUpdated();
        onClose();
      }
    } catch (error) {
      console.error('Ошибка при удалении клиента:', error);
    }
  };

  const handleWhatsApp = () => {
    if (!client) return;
    const cleanPhone = client.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleTelegram = () => {
    if (!client?.telegramId) return;
    window.open(`https://t.me/${client.telegramId}`, '_blank');
  };

  const handleQRCode = async () => {
    if (!client) return;

    if (!client.telegramId) {
      alert('У клиента не указан Telegram ID');
      return;
    }

    try {
      setQrLoading(true);
      
      const response = await fetch(`/api/clients/${client.id}/qr`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при получении QR-кода');
      }

      setQrUrl(data.qrUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('Ошибка при получении QR-кода:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при получении QR-кода');
    } finally {
      setQrLoading(false);
    }
  };

  // Функция для проверки статуса клиента
  const checkClientStatus = async () => {
    if (!client?.telegramId) return null;

    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: client.telegramId }),
      });

      const result = await response.json();
      setVisitData(result);
      return result;
    } catch (error) {
      console.error('Ошибка при проверке статуса:', error);
      return null;
    }
  };

  // Функция для отметки посещения
  const handleMarkVisit = async () => {
    if (!client?.telegramId) return;

    setIsMarking(true);
    try {
      const response = await fetch('/api/visits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: client.telegramId }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Обновляем данные клиента
        await loadClientDetails();
        // Обновляем статус
        await checkClientStatus();
        
        // Проверяем, нужно ли завершить абонемент
        await checkAndCompleteSubscription();
        
        // Уведомление уже отправлено в API /api/visits
      } else {
        console.error('Ошибка при отметке посещения:', result.error);
      }
    } catch (error) {
      console.error('Ошибка при отметке посещения:', error);
    } finally {
      setIsMarking(false);
    }
  };

  // Функция для заморозки дня
  const handleFreeze = async () => {
    if (!client?.telegramId) return;

    setIsFreezing(true);
    try {
      const response = await fetch('/api/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: client.telegramId, action: 'freeze' }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Обновляем данные клиента
        await loadClientDetails();
        // Обновляем статус
        await checkClientStatus();
      } else {
        console.error('Ошибка при заморозке дня:', result.error);
      }
    } catch (error) {
      console.error('Ошибка при заморозке:', error);
    } finally {
      setIsFreezing(false);
    }
  };

  // Функция для разморозки дня
  const handleUnfreeze = async () => {
    if (!client?.telegramId) return;

    setIsUnfreezing(true);
    try {
      const response = await fetch('/api/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: client.telegramId, action: 'unfreeze' }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Обновляем данные клиента
        await loadClientDetails();
        // Обновляем статус
        await checkClientStatus();
      } else {
        console.error('Ошибка при разморозке:', result.error);
      }
    } catch (error) {
      console.error('Ошибка при разморозке:', error);
    } finally {
      setIsUnfreezing(false);
    }
  };

  // Функция для проверки и завершения абонемента
  const checkAndCompleteSubscription = async () => {
    if (!client?.id) return;

    try {
      // Получаем актуальные данные об абонементе
      const response = await fetch(`/api/clients/${client.id}`);
      const clientData = await response.json();
      
      if (clientData.subscriptions && clientData.subscriptions.length > 0) {
        const activeSubscription = clientData.subscriptions.find((sub: any) => sub.status === 'active');
        
        if (activeSubscription) {
          const now = new Date();
          const endDate = new Date(activeSubscription.endDate);
          
          // Проверяем срок действия или количество посещений
          const shouldComplete = 
            activeSubscription.remainingDays === 0 || // Закончились посещения
            now > endDate; // Истек срок действия
          
          if (shouldComplete) {
            // Завершаем абонемент
            const updateResponse = await fetch(`/api/subscriptions/${activeSubscription.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'completed' }),
            });

            if (updateResponse.ok) {
              const reason = now > endDate ? 'истек срок действия' : 'закончились посещения';
              console.log(`Абонемент автоматически завершен - ${reason}`);
              // Перезагружаем данные клиента
              await loadClientDetails();
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке завершения абонемента:', error);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    // Время уже сохранено с +6 часов в БД, поэтому вычитаем их при отображении
    const date = new Date(dateString);
    const correctedDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
    
    return correctedDate.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            {client?.photoUrl ? (
              <Image
                src={client.photoUrl}
                alt={client.fullName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
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
              className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center"
              style={{ display: client?.photoUrl ? 'none' : 'flex' }}
            >
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {loading ? 'Загрузка...' : client?.fullName}
              </h2>
              {client && (
                <p className="text-gray-400 text-sm">
                  Клиент с {formatDate(client.createdAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && client && (
              <button
                onClick={startEditing}
                className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                title="Редактировать"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : client ? (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'info'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Информация
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Абонементы ({client.subscriptions?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'visits'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Посещения ({client.visits?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'feedback'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Отзывы ({client.feedback?.length || 0})
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {isEditing ? (
                    /* Edit Form */
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                      <div className="flex items-center mb-6">
                        <Edit3 className="w-5 h-5 text-blue-400 mr-2" />
                        <h3 className="text-lg font-semibold text-white">Редактирование профиля</h3>
                      </div>

                      <div className="space-y-6">
                        {/* Photo Edit Section */}
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            Фото профиля
                          </label>
                          <div className="flex items-center space-x-6">
                            <div className="relative group">
                              {editForm.photoUrl ? (
                                <Image
                                  src={editForm.photoUrl}
                                  alt="Photo preview"
                                  width={80}
                                  height={80}
                                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-600 group-hover:border-blue-500 transition-colors"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600 group-hover:border-blue-500 transition-colors">
                                  <User className="w-10 h-10 text-gray-400" />
                                </div>
                              )}
                              {uploading && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Edit3 className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  Загрузить файл
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    disabled={uploading}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={openCamera}
                                  disabled={uploading}
                                  className="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Камера
                                </button>
                              </div>
                              <p className="text-gray-400 text-xs mt-2">
                                Максимальный размер: 5MB. Форматы: JPG, PNG, WebP, GIF
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Name Edit */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <User className="w-4 h-4 inline mr-1" />
                              Полное имя
                            </label>
                            <input
                              type="text"
                              name="fullName"
                              value={editForm.fullName}
                              onChange={handleEditInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
                              placeholder="Введите полное имя"
                            />
                          </div>

                          {/* Phone Edit */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <Phone className="w-4 h-4 inline mr-1" />
                              Телефон
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={editForm.phone}
                              onChange={handleEditInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
                              placeholder="+7 (999) 123-45-67"
                            />
                          </div>

                          {/* Telegram Edit */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              <MessageCircle className="w-4 h-4 inline mr-1" />
                              Telegram ID
                            </label>
                            <input
                              type="text"
                              name="telegramId"
                              value={editForm.telegramId}
                              onChange={handleEditInputChange}
                              placeholder="@username или ID"
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-gray-700 transition-all"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700/50">
                          <button
                            onClick={saveChanges}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 text-white rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 font-medium"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Сохранение...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Сохранить изменения
                              </>
                            )}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 font-medium"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Отменить
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="space-y-6">
                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Телефон
                        </label>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{client.phone}</span>
                          <button
                            onClick={handleWhatsApp}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                          >
                            WhatsApp
                          </button>
                        </div>
                      </div>
                      
                      {client.telegramId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Telegram
                          </label>
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-white">{client.telegramId}</span>
                            <button
                              onClick={handleTelegram}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                            >
                              Написать
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Статус абонемента
                        </label>
                        <div className="flex items-center space-x-2">
                          {client.subscriptions && client.subscriptions.length > 0 ? (
                            client.subscriptions.some(s => s.status === 'active') ? (
                              <>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-white">Есть активный абонемент</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-white">Абонемент неактивен</span>
                              </>
                            )
                          ) : (
                            <>
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-white">Нет абонемента</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {client.tariff && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Тариф
                          </label>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-white">
                              {client.tariff.name} - ₽{client.tariff.price}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-gray-700">
                        {/* Статус */}
                        {client.telegramId && visitData && (
                          <div className="mb-3 text-sm text-gray-400">
                            {visitData.success ? (
                              visitData.isFrozenToday ? 'День заморожен' : 'Доступ открыт'
                            ) : (
                              visitData.errorType === 'ALREADY_VISITED_TODAY' ? 'Уже отмечено сегодня' :
                              visitData.errorType === 'OUTSIDE_WORKING_HOURS' ? 'Вне рабочих часов' :
                              visitData.errorType === 'NO_ACTIVE_SUBSCRIPTION' ? 'Нет абонемента' :
                              visitData.errorType === 'SUBSCRIPTION_EXPIRED' ? 'Абонемент истек' :
                              'Доступ закрыт'
                            )}
                          </div>
                        )}
                        
                        {/* Адаптивные кнопки - на мобильных по 2 в ряд */}
                        <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2">
                          {client.telegramId && (
                            <button
                              onClick={handleQRCode}
                              disabled={qrLoading}
                              className="flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors text-sm"
                            >
                              {qrLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Загрузка...
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-4 h-4 mr-2" />
                                  QR-код
                                </>
                              )}
                            </button>
                          )}

                          {/* Кнопки действий с посещениями */}
                          {client.telegramId && visitData && visitData.success && (
                            <>
                              {/* Если день заморожен и можно разморозить */}
                              {visitData.isFrozenToday && visitData.canUnfreeze ? (
                                <button
                                  onClick={handleUnfreeze}
                                  disabled={isUnfreezing}
                                  className="flex items-center justify-center px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white rounded-lg transition-colors text-sm"
                                >
                                  {isUnfreezing ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                      Размораживаем...
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-4 h-4 mr-2" />
                                      Разморозить
                                    </>
                                  )}
                                </button>
                              ) : (
                                /* Обычные кнопки */
                                <>
                                  <button
                                    onClick={handleMarkVisit}
                                    disabled={isMarking}
                                    className="flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-sm"
                                  >
                                    {isMarking ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Отмечаем...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Отметить
                                      </>
                                    )}
                                  </button>

                                  {visitData.canFreeze && (
                                    <button
                                      onClick={handleFreeze}
                                      disabled={isFreezing}
                                      className="flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                    >
                                      {isFreezing ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                          Замораживаем...
                                        </>
                                      ) : (
                                        <>
                                          <Snowflake className="w-4 h-4 mr-2" />
                                          Заморозить
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => setShowConfirmDelete(true)}
                            className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <SubscriptionManagement
                  clientId={client.id}
                  subscriptions={client.subscriptions || []}
                  onUpdate={loadClientDetails}
                />
              )}

              {activeTab === 'visits' && (
                <div className="space-y-3">
                  {!client.visits || client.visits.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Посещений пока нет
                    </div>
                  ) : (
                    client.visits.map((visit) => {
                      // Дата из БД уже содержит +6 часов, работаем с ней как есть
                      const visitDate = new Date(visit.visitDate);
                      
                      // Текущее время + 6 часов (приводим к той же временной зоне что в БД)
                      const now = new Date();
                      const currentTimeWithOffset = new Date(now.getTime() + 6 * 60 * 60 * 1000);
                      
                      // Сравниваем только даты (без времени)
                      const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
                      const todayOnly = new Date(currentTimeWithOffset.getFullYear(), currentTimeWithOffset.getMonth(), currentTimeWithOffset.getDate());
                      
                      const isToday = visitDateOnly.getTime() === todayOnly.getTime();
                      const isFreezeDay = visit.isFreezeDay;
                      
                      return (
                        <div key={visit.id} className={`rounded-lg p-3 ${isFreezeDay ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700'}`}>
                          {/* Desktop layout */}
                          <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Calendar className={`w-4 h-4 ${isFreezeDay ? 'text-blue-400' : 'text-gray-400'}`} />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-white text-sm">
                                    {formatDateTime(visit.visitDate)}
                                  </p>
                                  {isFreezeDay && (
                                    <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                                      Заморозка
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-400 text-xs">
                                  {visit.subscription?.tariff?.name || 'Без тарифа'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <QrCode className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400 text-xs">
                                {visit.qrCode}
                              </span>
                              {/* Кнопка разморозки только для сегодняшних замороженных дней */}
                              {isFreezeDay && isToday && (
                                <button
                                  onClick={() => handleUnfreezeDay(visit.id, visit.subscriptionId)}
                                  className="ml-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                                  title="Разморозить день"
                                >
                                  Разморозить
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mobile layout */}
                          <div className="sm:hidden space-y-3">
                            {/* Основная информация */}
                            <div className="flex items-center space-x-3">
                              <Calendar className={`w-4 h-4 ${isFreezeDay ? 'text-blue-400' : 'text-gray-400'}`} />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <p className="text-white text-sm">
                                    {formatDateTime(visit.visitDate)}
                                  </p>
                                  {isFreezeDay && (
                                    <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                                      Заморозка
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-400 text-xs">
                                  {visit.subscription?.tariff?.name || 'Без тарифа'}
                                </p>
                              </div>
                            </div>

                            {/* QR код и кнопка разморозки */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <QrCode className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-400 text-xs truncate">
                                  {visit.qrCode}
                                </span>
                              </div>
                              {/* Кнопка разморозки только для сегодняшних замороженных дней */}
                              {isFreezeDay && isToday && (
                                <button
                                  onClick={() => handleUnfreezeDay(visit.id, visit.subscriptionId)}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors font-medium"
                                  title="Разморозить день"
                                >
                                  Разморозить
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="space-y-3">
                  {!client.feedback || client.feedback.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Отзывов пока нет
                    </div>
                  ) : (
                    client.feedback.map((feedback) => (
                      <div key={feedback.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-white text-sm mb-2">
                              {feedback.message}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {formatDateTime(feedback.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Confirm Delete Modal */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Подтвердите удаление
              </h3>
              <p className="text-gray-400 mb-6">
                Вы уверены, что хотите удалить клиента? Это действие нельзя отменить.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteClient}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Сделать фото</h3>
              <button
                onClick={closeCamera}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="text-center py-8">
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
                  <p className="text-red-300">{cameraError}</p>
                </div>
                <button
                  onClick={closeCamera}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-4 bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    webkit-playsinline="true"
                    className="w-full h-64 object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-white text-sm">Загрузка фото...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={closeCamera}
                    disabled={uploading}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={takePhoto}
                    disabled={uploading}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Сделать фото
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно для просмотра изображения */}
      {client?.photoUrl && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={client.photoUrl}
          altText={client.fullName}
          title={`Фото клиента: ${client.fullName}`}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && qrUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">QR-код для {client?.fullName}</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <div className="bg-white p-4 rounded-lg mb-4 inline-block">
                <Image
                  src={qrUrl}
                  alt="QR Code"
                  width={256}
                  height={256}
                  className="w-64 h-64"
                />
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Telegram ID: {client?.telegramId}
              </p>
              <p className="text-gray-400 text-xs mb-4">
                Отсканируйте этот QR-код для получения Telegram ID клиента
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrUrl;
                    link.download = `qr-${client?.fullName}-${client?.telegramId}.png`;
                    link.click();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Скачать
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
