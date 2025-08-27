'use client';

import { useState } from 'react';
import QRCode from 'qrcode';

export default function QRTestPage() {
  const [qrDataURL, setQrDataURL] = useState<string>('');
  const [telegramId, setTelegramId] = useState('123456789');

  const generateQR = async (id: string) => {
    try {
      const url = await QRCode.toDataURL(id, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataURL(url);
    } catch (error) {
      console.error('Ошибка генерации QR-кода:', error);
    }
  };

  const predefinedIds = [
    { id: '123456789', label: 'Тестовый клиент #1' },
    { id: '987654321', label: 'Тестовый клиент #2' },
    { id: '555666777', label: 'Тестовый клиент #3' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Тестирование QR-сканера</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Генератор QR-кодов */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Генератор QR-кодов</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telegram ID
              </label>
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Введите telegram ID"
              />
            </div>
            
            <button
              onClick={() => generateQR(telegramId)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Генерировать QR-код
            </button>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Или выберите готовый:</p>
              {predefinedIds.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTelegramId(item.id);
                    generateQR(item.id);
                  }}
                  className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                >
                  {item.label} ({item.id})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Отображение QR-кода */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">QR-код для сканирования</h2>
          
          {qrDataURL ? (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img 
                  src={qrDataURL} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <p className="text-gray-300 text-sm">
                Telegram ID: <span className="font-mono text-green-400">{telegramId}</span>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Наведите QR-сканер на этот код для тестирования
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-64 h-64 bg-gray-700 rounded-lg mx-auto flex items-center justify-center">
                <p className="text-gray-400">QR-код появится здесь</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Инструкции */}
      <div className="bg-gray-800 rounded-lg p-6 mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Инструкция по тестированию</h2>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5">1</span>
            <p>Включите QR-сканер, нажав на иконку камеры в хедере</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5">2</span>
            <p>Разрешите доступ к камере в браузере</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5">3</span>
            <p>Разверните компактный сканер в правом нижнем углу</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5">4</span>
            <p>Наведите камеру на сгенерированный QR-код</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mt-0.5">5</span>
            <p>Откройте консоль браузера (F12) для просмотра логов</p>
          </div>
        </div>
      </div>
    </div>
  );
}
