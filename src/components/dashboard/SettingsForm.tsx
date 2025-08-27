'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Settings, MessageCircle, Bot, User, Lock, Upload, Image, Trash2 } from 'lucide-react';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import ContactsManager from './ContactsManager';

interface SettingsData {
  adminLogin: string;
  adminTelegram: string;
  adminBotToken: string;
  welcomeImageUrl: string;
}

export default function SettingsForm() {
  const [formData, setFormData] = useState<SettingsData>({
    adminLogin: '',
    adminTelegram: '',
    adminBotToken: '',
    welcomeImageUrl: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
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
            adminBotToken: data.adminBotToken || '',
            welcomeImageUrl: data.welcomeImageUrl || ''
          });
          
          // Устанавливаем превью, если есть картинка
          if (data.welcomeImageUrl) {
            setImagePreview(data.welcomeImageUrl);
          }
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

  // Обработка выбора файла картинки
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        error('Ошибка', 'Выберите файл изображения');
        return;
      }

      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error('Ошибка', 'Размер файла не должен превышать 5MB');
        return;
      }

      setImageFile(file);
      
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Удаление картинки
  const handleRemoveImage = async () => {
    if (!formData.welcomeImageUrl) return;

    setIsUploadingImage(true);
    try {
      const response = await fetch('/api/settings/image', {
        method: 'DELETE',
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, welcomeImageUrl: '' }));
        setImagePreview('');
        setImageFile(null);
        success('Успешно', 'Картинка удалена');
      } else {
        error('Ошибка', 'Не удалось удалить картинку');
      }
    } catch (err) {
      error('Ошибка', 'Ошибка подключения к серверу');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let welcomeImageUrl = formData.welcomeImageUrl;

      // Сначала загружаем картинку, если она выбрана
      if (imageFile) {
        const formDataImage = new FormData();
        formDataImage.append('image', imageFile);

        const imageResponse = await fetch('/api/settings/image', {
          method: 'POST',
          body: formDataImage
        });

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          welcomeImageUrl = imageResult.imageUrl;
        } else {
          error('Ошибка', 'Не удалось загрузить картинку');
          return;
        }
      }

      // Затем сохраняем остальные настройки
      const payload = {
        ...formData,
        welcomeImageUrl,
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
        setImageFile(null); // Очищаем выбранный файл
        
        // Обновляем URL картинки в форме
        setFormData(prev => ({ ...prev, welcomeImageUrl }));
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

          {/* Настройки изображения для бота */}
          <div className="bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Image className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Приветственное изображение</h2>
                <p className="text-gray-400 text-sm">Картинка, которая показывается в телеграм боте</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Превью текущей картинки */}
              {imagePreview && (
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <img
                      src={imagePreview}
                      alt="Превью"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 mb-2">Текущее изображение</p>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={isUploadingImage}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Загрузка новой картинки */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Загрузить новое изображение
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-300">Выбрать файл</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imageFile && (
                    <span className="text-sm text-gray-400">
                      {imageFile.name}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Поддерживаются форматы: JPG, PNG, GIF. Максимальный размер: 5MB
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

        {/* Управление контактами - вынесено за пределы формы */}
        <ContactsManager />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
