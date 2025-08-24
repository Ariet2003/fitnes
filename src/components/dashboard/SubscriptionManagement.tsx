'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  Pause, 
  Play, 
  Plus, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  X,
  Calendar
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

interface Tariff {
  id: number;
  name: string;
  price: number;
  duration: number;
  durationDays: number;
  freezeLimit: number;
}

interface SubscriptionManagementProps {
  clientId: number;
  subscriptions: Subscription[];
  onUpdate: () => void;
}

export default function SubscriptionManagement({ 
  clientId,
  subscriptions, 
  onUpdate 
}: SubscriptionManagementProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [addFormData, setAddFormData] = useState({
    tariffId: '',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [addLoading, setAddLoading] = useState(false);

  // Загружаем тарифы при открытии модального окна
  useEffect(() => {
    if (showAddModal) {
      loadTariffs();
    }
  }, [showAddModal]);

  const loadTariffs = async () => {
    try {
      const response = await fetch('/api/tariffs');
      if (response.ok) {
        const data = await response.json();
        setTariffs(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки тарифов:', error);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setAddFormData({
      tariffId: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddFormData({
      tariffId: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({ ...prev, [name]: value }));
  };

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setAddFormData(prev => ({ ...prev, startDate: date.toISOString().split('T')[0] }));
  };

  const getSelectedTariff = () => {
    return addFormData.tariffId ? tariffs.find(t => t.id === parseInt(addFormData.tariffId)) : null;
  };

  const calculateEndDate = () => {
    const selectedTariff = getSelectedTariff();
    if (!selectedTariff || !addFormData.startDate) return '';
    
    const startDate = new Date(addFormData.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + selectedTariff.durationDays);
    
    return endDate.toLocaleDateString('ru-RU');
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addFormData.tariffId) {
      setError('Выберите тариф');
      return;
    }

    try {
      setAddLoading(true);
      setError('');

      const selectedTariff = getSelectedTariff();
      if (!selectedTariff) return;

      // Создаем подписку
      const startDate = new Date(addFormData.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + selectedTariff.durationDays);

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          tariffId: parseInt(addFormData.tariffId),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'active',
          remainingDays: selectedTariff.durationDays
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при создании абонемента');
      }

      closeAddModal();
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании абонемента');
    } finally {
      setAddLoading(false);
    }
  };

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
        {/* Показываем кнопку "Добавить" только если нет активных абонементов */}
        {!subscriptions.some(s => s.status === 'active') && (
          <button 
            onClick={openAddModal}
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить абонемент
          </button>
        )}
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
                  </>
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

      {/* Modal для добавления абонемента */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Добавить абонемент</h3>
              <button
                onClick={closeAddModal}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="p-6 space-y-4">
              {/* Выбор тарифа */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Тариф
                </label>
                <select
                  name="tariffId"
                  value={addFormData.tariffId}
                  onChange={handleAddInputChange}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Выберите тариф</option>
                  {tariffs.map(tariff => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} - ₽{tariff.price} | {tariff.durationDays} дней | {tariff.duration} мес. | {tariff.freezeLimit} заморозок
                    </option>
                  ))}
                </select>
              </div>

              {/* Дата начала */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Дата начала
                </label>
                
                {/* Быстрые кнопки */}
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

                <input
                  type="date"
                  name="startDate"
                  value={addFormData.startDate}
                  onChange={handleAddInputChange}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />

                {/* Рассчитанная дата окончания */}
                {calculateEndDate() && (
                  <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-green-300 text-sm">
                      <span className="font-medium">Дата окончания:</span> {calculateEndDate()}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={addLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  {addLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Создание...
                    </>
                  ) : (
                    'Создать абонемент'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
