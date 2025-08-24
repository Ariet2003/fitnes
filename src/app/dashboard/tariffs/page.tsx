'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  CreditCard,
  Calendar,
  Users,
  Clock
} from 'lucide-react';

interface Tariff {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  duration: number; // срок действия в месяцах
  freezeLimit: number;
  _count: {
    clients: number;
    subscriptions: number;
  };
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    freezeLimit: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTariffs();
  }, []);

  const loadTariffs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tariffs');
      if (response.ok) {
        const data = await response.json();
        setTariffs(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки тарифов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const calculateDurationDays = (months: number) => {
    return Math.round(months * 30.44); // Среднее количество дней в месяце
  };

  const openCreateModal = () => {
    setEditingTariff(null);
    setFormData({
      name: '',
      price: '',
      duration: '',
      freezeLimit: ''
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      price: tariff.price.toString(),
      duration: tariff.duration.toString(),
      freezeLimit: tariff.freezeLimit.toString()
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.duration || !formData.freezeLimit) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    const duration = parseInt(formData.duration);
    const durationDays = calculateDurationDays(duration);

    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      duration,
      durationDays,
      freezeLimit: parseInt(formData.freezeLimit)
    };

    try {
      const url = editingTariff ? `/api/tariffs/${editingTariff.id}` : '/api/tariffs';
      const method = editingTariff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении тарифа');
      }

      setShowModal(false);
      loadTariffs();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при сохранении тарифа');
    }
  };

  const handleDelete = async (tariff: Tariff) => {
    if (tariff._count.clients > 0 || tariff._count.subscriptions > 0) {
      alert('Нельзя удалить тариф, к которому привязаны клиенты или подписки');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить тариф "${tariff.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tariffs/${tariff.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при удалении тарифа');
      }

      loadTariffs();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при удалении тарифа');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Управление тарифами</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить тариф
        </button>
      </div>

      <div className="grid gap-4">
        {tariffs.map(tariff => (
          <div key={tariff.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{tariff.name}</h3>
                    <p className="text-3xl font-bold text-blue-400">₽{tariff.price}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Срок действия</p>
                      <p className="text-white font-medium">{tariff.duration} мес.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Дней</p>
                      <p className="text-white font-medium">{tariff.durationDays} дней</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                    </svg>
                    <div>
                      <p className="text-gray-400">Заморозки</p>
                      <p className="text-white font-medium">{tariff.freezeLimit}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Клиенты</p>
                      <p className="text-white font-medium">{tariff._count.clients + tariff._count.subscriptions}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => openEditModal(tariff)}
                  className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Редактировать"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tariff)}
                  disabled={tariff._count.clients > 0 || tariff._count.subscriptions > 0}
                  className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {tariffs.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Тарифы не найдены</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Создать первый тариф
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {editingTariff ? 'Редактировать тариф' : 'Новый тариф'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название тарифа
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Например: Стандарт"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="3000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Срок действия (месяцев)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="1"
                  min="1"
                />
                {formData.duration && (
                  <p className="text-gray-400 text-xs mt-1">
                    ≈ {calculateDurationDays(parseInt(formData.duration) || 0)} дней
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Количество заморозок
                </label>
                <input
                  type="number"
                  name="freezeLimit"
                  value={formData.freezeLimit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="3"
                  min="0"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingTariff ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
