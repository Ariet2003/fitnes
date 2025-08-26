'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MessageCircle, 
  Calendar, 
  CreditCard, 
  X,
  ArrowLeft,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ImageModal from './ImageModal';

interface UserProfileProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

interface UserDetails {
  id: number;
  fullName: string;
  phone: string;
  photoUrl?: string;
  telegramId?: string;
  status: boolean;
  createdAt: string;
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

export default function UserProfile({ userId, isOpen, onClose, isMobile = false }: UserProfileProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'subscriptions' | 'visits'>('info');

  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails();
    }
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleTelegram = (telegramId?: string) => {
    if (telegramId) {
      window.open(`https://t.me/${telegramId}`, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy в HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (subscription: UserDetails['subscriptions'][0]) => {
    if (subscription.status === 'completed') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">Завершен</span>;
    }
    if (subscription.status === 'frozen') {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">Заморожен</span>;
    }
    if (subscription.remainingDays <= 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-700 text-red-300">Истек</span>;
    } else if (subscription.remainingDays <= 3) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-900 text-orange-300">Истекает</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-900 text-green-300">Активен</span>;
  };

  if (!isOpen) return null;

  const ProfileContent = () => (
    <div className="h-full overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : user ? (
        <div className="space-y-4">
          {/* Заголовок с фото */}
          <div className="text-center">
            <div className="relative inline-block mb-3">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-full object-cover mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowImageModal(true)}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 ${
                isMobile ? 'border-gray-900' : 'border-gray-800'
              } ${
                user.subscriptions?.some(s => s.status === 'active') ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">{user.fullName}</h2>
            <p className="text-gray-400 text-sm mb-3">Клиент с {formatDate(user.createdAt)}</p>
            
            {/* Быстрые действия */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => handleWhatsApp(user.phone)}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
              {user.telegramId && (
                <button
                  onClick={() => handleTelegram(user.telegramId)}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Telegram
                </button>
              )}
            </div>
          </div>

          {/* Табы */}
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'info', name: 'Инфо', icon: User },
                { id: 'subscriptions', name: 'Абонементы', icon: CreditCard },
                { id: 'visits', name: 'Посещения', icon: Calendar }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4 inline mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Содержимое табов */}
          <div className="space-y-4">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-white font-medium">Контактная информация</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Телефон:</span>
                      <span className="text-white">{user.phone}</span>
                    </div>
                    {user.telegramId && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Telegram:</span>
                        <span className="text-white">@{user.telegramId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-white font-medium">Статистика</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{user.subscriptions.length}</div>
                      <div className="text-gray-400">Абонементов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{user.visits.length}</div>
                      <div className="text-gray-400">Посещений</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-3">
                {user.subscriptions.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {user.subscriptions.map((subscription) => (
                      <div key={subscription.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{subscription.tariff.name}</h4>
                          {getStatusBadge(subscription)}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Цена:</span>
                            <span className="text-white">{subscription.tariff.price} ₽</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Период:</span>
                            <span className="text-white">
                              {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Осталось дней:</span>
                            <span className="text-white">{subscription.remainingDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Заморозка:</span>
                            <span className="text-white">
                              {subscription.freezeUsed} / {subscription.tariff.freezeLimit} дн.
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Нет абонементов</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="space-y-3">
                {user.visits.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {user.visits.map((visit) => (
                      <div key={visit.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium">
                              {formatDateTime(visit.visitDate)}
                            </span>
                          </div>
                          {visit.isFreezeDay && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">
                              Заморозка
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          Абонемент: {visit.subscription.tariff.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Нет посещений</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Пользователь не найден</p>
        </div>
      )}

      {/* Модальное окно для изображения */}
      {user?.photoUrl && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={user.photoUrl}
          altText={user.fullName}
          title={`Фото пользователя: ${user.fullName}`}
        />
      )}

      {/* Стили для прокрутки */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );

  // Мобильная версия - полноэкранная
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Профиль пользователя</h1>
          <div className="w-9"></div> {/* Пустое место для выравнивания */}
        </div>
        
        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <ProfileContent />
          </div>
        </div>
      </div>
    );
  }

  // Десктопная версия - модальное окно
  return (
    <div className="fixed inset-0 z-60 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Профиль пользователя</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Содержимое с прокруткой */}
        <div className="overflow-y-auto max-h-[calc(85vh-4rem)]">
          <div className="p-4">
            <ProfileContent />
          </div>
        </div>
      </div>
    </div>
  );
}
