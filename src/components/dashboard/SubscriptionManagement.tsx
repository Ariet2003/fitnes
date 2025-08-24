'use client';

import { useState } from 'react';
import { 
  Clock, 
  Pause, 
  Play, 
  Plus, 
  X, 
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Subscription {
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
}

interface SubscriptionManagementProps {
  clientId: number;
  subscriptions: Subscription[];
  onUpdate: () => void;
}

export default function SubscriptionManagement({ 
  subscriptions, 
  onUpdate 
}: SubscriptionManagementProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [showExtendModal, setShowExtendModal] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState('');
  const [error, setError] = useState('');

  const handleSubscriptionAction = async (subscriptionId: number, action: string, days?: number) => {
    setLoading(subscriptionId);
    setError('');

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          days
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при выполнении действия');
      }

      onUpdate();
      setShowExtendModal(null);
      setExtendDays('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-900 text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Активен
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">
            <Pause className="w-3 h-3 mr-1" />
            Заморожен
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            Завершен
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-900 text-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getDaysLeftColor = (days: number) => {
    if (days <= 0) return 'text-red-400';
    if (days <= 7) return 'text-orange-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Абонементы</h3>
        <button className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="text-center py-8 bg-gray-700 rounded-lg">
          <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">У клиента нет активных абонементов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    {subscription.tariff.name}
                  </h4>
                  <p className="text-gray-400 text-xs">₽{subscription.tariff.price}</p>
                </div>
                {getStatusBadge(subscription.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                <div>
                  <span className="text-gray-400">Период:</span>
                  <p className="text-white">
                    {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Осталось:</span>
                  <p className={`font-semibold ${getDaysLeftColor(subscription.remainingDays)}`}>
                    {subscription.remainingDays} дн.
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Заморозок:</span>
                  <p className="text-white">
                    {subscription.freezeUsed} / {subscription.tariff.freezeLimit}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Статус:</span>
                  <p className="text-white capitalize">{subscription.status}</p>
                </div>
              </div>

              {/* Действия */}
              <div className="flex flex-wrap gap-2">
                {subscription.status === 'active' && (
                  <>
                    {subscription.freezeUsed < subscription.tariff.freezeLimit && (
                      <button
                        onClick={() => handleSubscriptionAction(subscription.id, 'freeze')}
                        disabled={loading === subscription.id}
                        className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs transition-colors"
                      >
                        <Pause className="w-3 h-3 mr-1" />
                        {loading === subscription.id ? 'Заморозка...' : 'Заморозить'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowExtendModal(subscription.id)}
                      className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Продлить
                    </button>
                  </>
                )}

                {subscription.status === 'frozen' && (
                  <button
                    onClick={() => handleSubscriptionAction(subscription.id, 'unfreeze')}
                    disabled={loading === subscription.id}
                    className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs transition-colors"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {loading === subscription.id ? 'Разморозка...' : 'Разморозить'}
                  </button>
                )}

                {subscription.status === 'active' && (
                  <button
                    onClick={() => handleSubscriptionAction(subscription.id, 'complete')}
                    disabled={loading === subscription.id}
                    className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded text-xs transition-colors"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {loading === subscription.id ? 'Завершение...' : 'Завершить'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно продления */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Продлить абонемент</h3>
              <button
                onClick={() => setShowExtendModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Количество дней
              </label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="Введите количество дней"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExtendModal(null)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const days = parseInt(extendDays);
                  if (days > 0) {
                    handleSubscriptionAction(showExtendModal, 'extend', days);
                  }
                }}
                disabled={!extendDays || parseInt(extendDays) <= 0}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Продлить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
