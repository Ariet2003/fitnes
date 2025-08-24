'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Activity, 
  CreditCard, 
  Clock, 
  Pause, 
  Play, 
  Edit3,
  Trash2,
  MessageSquare,
  QrCode
} from 'lucide-react';
import Image from 'next/image';
import SubscriptionManagement from './SubscriptionManagement';

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
    window.open(`https://wa.me/7${cleanPhone}`, '_blank');
  };

  const handleTelegram = () => {
    if (!client?.telegramId) return;
    window.open(`https://t.me/${client.telegramId}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'frozen': return 'text-blue-400';
      case 'completed': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'frozen': return 'Заморожен';
      case 'completed': return 'Завершен';
      default: return 'Неизвестно';
    }
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
                className="w-12 h-12 rounded-full object-cover"
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
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                  <div className="flex space-x-3 pt-4 border-t border-gray-700">
                    <button className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Редактировать
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </button>
                  </div>
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
                    client.visits.map((visit) => (
                      <div key={visit.id} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-white text-sm">
                                {formatDateTime(visit.visitDate)}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {visit.subscription.tariff.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <QrCode className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-xs">
                              {visit.qrCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
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
    </div>
  );
}
