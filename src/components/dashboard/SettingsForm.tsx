'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Settings, MessageCircle, Bot, User, Lock } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface SettingsData {
  adminLogin: string;
  adminTelegram: string;
  adminBotToken: string;
}

export default function SettingsForm() {
  const [formData, setFormData] = useState<SettingsData>({
    adminLogin: '',
    adminTelegram: '',
    adminBotToken: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toasts, removeToast, success, error } = useToast();

  // Загружаем текущие настройки
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log('Загружаем настройки...');
        const response = await fetch('/api/settings');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Полученные данные:', data);
          setFormData({
            adminLogin: data.adminLogin || '',
            adminTelegram: data.adminTelegram || '',
            adminBotToken: data.adminBotToken || ''
          });
        } else {
          const errorText = await response.text();
          console.error('Ошибка API:', response.status, errorText);
          error('Ошибка', `Не удалось загрузить настройки: ${response.status}`);
        }
      } catch (err) {
        console.error('Ошибка запроса:', err);
        error('Ошибка', 'Ошибка подключения к серверу');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []); // Пустой массив зависимостей

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        adminPassword: newPassword || undefined
      };

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        success('Успешно', 'Настройки сохранены');
        setNewPassword(''); // Очищаем поле пароля
      } else {
        error('Ошибка', result.error || 'Не удалось сохранить настройки');
      }
    } catch (err) {
      error('Ошибка', 'Ошибка подключения к серверу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof SettingsData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Настройки системы</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Конфигурация и настройки приложения</p>
        </div>
        
        <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Настройки системы</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Конфигурация и настройки приложения</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Настройки администратора */}
          <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Администратор</h2>
                <p className="text-gray-400 text-sm">Данные для входа в систему</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="adminLogin" className="block text-sm font-medium text-gray-300 mb-2">
                  Логин администратора
                </label>
                <input
                  id="adminLogin"
                  type="text"
                  value={formData.adminLogin}
                  onChange={(e) => handleInputChange('adminLogin', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="admin"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Новый пароль
                  <span className="text-gray-500 text-xs ml-1">(оставьте пустым, чтобы не менять)</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors pr-12"
                    placeholder="Введите новый пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Настройки Telegram */}
          <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Telegram</h2>
                <p className="text-gray-400 text-sm">Настройки для уведомлений и авторизации</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="adminTelegram" className="block text-sm font-medium text-gray-300 mb-2">
                  Telegram ID администратора
                </label>
                <input
                  id="adminTelegram"
                  type="text"
                  value={formData.adminTelegram}
                  onChange={(e) => handleInputChange('adminTelegram', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="728991415"
                  pattern="[0-9]+"
                  title="Только цифры"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">
                  Для получения ID напишите боту @getmy_idbot
                </p>
              </div>

              <div>
                <label htmlFor="adminBotToken" className="block text-sm font-medium text-gray-300 mb-2">
                  Bot Token
                </label>
                <div className="relative">
                  <input
                    id="adminBotToken"
                    type={showBotToken ? 'text' : 'password'}
                    value={formData.adminBotToken}
                    onChange={(e) => handleInputChange('adminBotToken', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors pr-12"
                    placeholder="8127660112:AAEkXMO5Sq65TKlNpe-PhiEJ_6Ed6Ng7zCQ"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showBotToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Получите токен у @BotFather в Telegram
                </p>
              </div>
            </div>
          </div>

          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить настройки
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
