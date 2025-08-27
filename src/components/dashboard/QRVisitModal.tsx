'use client';

import { useState } from 'react';
import { X, User, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface QRVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedData: {
    success: boolean;
    error?: string;
    errorType?: string;
    client?: {
      id: number;
      fullName: string;
      phone: string;
      photoUrl?: string | null;
    };
    subscription?: {
      id: number;
      tariffName: string;
      endDate: string;
      remainingDays: number;
      freezeUsed: number;
      freezeLimit: number;
      status: string;
    };
    visitTime?: string;
    workingHours?: {
      start: string;
      end: string;
    };
    canFreeze?: boolean;
    isFrozenToday?: boolean;
    canUnfreeze?: boolean;
  } | null;
  onMarkVisit: () => void;
  telegramId?: string;
}

export default function QRVisitModal({ 
  isOpen, 
  onClose, 
  scannedData,
  onMarkVisit,
  telegramId 
}: QRVisitModalProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [isUnfrozen, setIsUnfrozen] = useState(false);

  if (!isOpen || !scannedData) return null;

  const handleMarkVisit = async () => {
    setIsMarking(true);
    try {
      await onMarkVisit();
    } finally {
      setIsMarking(false);
    }
  };

  const handleFreeze = async () => {
    if (!telegramId) return;
    
    setIsFreezing(true);
    try {
      const response = await fetch('/api/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId, action: 'freeze' }),
      });

      const result = await response.json();
      if (result.success) {
        // Обновляем данные и закрываем модальное окно
        onClose();
      }
    } catch (error) {
      console.error('Ошибка при заморозке:', error);
    } finally {
      setIsFreezing(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!telegramId) return;
    
    setIsUnfreezing(true);
    try {
      const response = await fetch('/api/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId, action: 'unfreeze' }),
      });

      const result = await response.json();
      if (result.success) {
        setIsUnfrozen(true);
      }
    } catch (error) {
      console.error('Ошибка при разморозке:', error);
    } finally {
      setIsUnfreezing(false);
    }
  };

  const getErrorIcon = (errorType?: string) => {
    switch (errorType) {
      case 'CLIENT_NOT_FOUND':
      case 'NO_ACTIVE_SUBSCRIPTION':
      case 'SUBSCRIPTION_EXPIRED':
        return <AlertTriangle className="w-12 h-12 text-red-500" />;
      case 'OUTSIDE_WORKING_HOURS':
        return <Clock className="w-12 h-12 text-orange-500" />;
      case 'ALREADY_VISITED_TODAY':
        return <CheckCircle className="w-12 h-12 text-blue-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-red-500" />;
    }
  };

  const getErrorColor = (errorType?: string) => {
    switch (errorType) {
      case 'OUTSIDE_WORKING_HOURS':
        return 'border-orange-500 bg-orange-900/20';
      case 'ALREADY_VISITED_TODAY':
        return 'border-blue-500 bg-blue-900/20';
      default:
        return 'border-red-500 bg-red-900/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-700 shadow-2xl">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-lg font-semibold">Информация о клиенте</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-gray-800">
          {/* Информация о клиенте - всегда показываем */}
          {scannedData.client && (
            <div className="mb-6">
              {/* Фото и основная информация */}
              <div className="flex items-center space-x-4 mb-4">
                {scannedData.client.photoUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-600">
                    <Image
                      src={scannedData.client.photoUrl}
                      alt={scannedData.client.fullName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {scannedData.client.fullName}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {scannedData.client.phone}
                  </p>
                </div>
              </div>

              {/* Информация об абонементе */}
              {scannedData.subscription && (
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Тариф</div>
                      <div className="text-white font-medium">
                        {scannedData.subscription.tariffName}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Действует до</div>
                      <div className="text-white font-medium">
                        {new Date(scannedData.subscription.endDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Осталось дней</div>
                      <div className="text-green-400 font-semibold">
                        {scannedData.subscription.remainingDays}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">Заморозка</div>
                      <div className="text-white font-medium">
                        {scannedData.subscription.freezeUsed}/{scannedData.subscription.freezeLimit}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Статус доступа */}
          <div className="mb-6">
            <div className={`rounded-lg p-4 border-2 ${
              scannedData.success ? 'border-green-500 bg-green-900/20' : getErrorColor(scannedData.errorType)
            }`}>
              <div className="flex items-center space-x-3 mb-2">
                {scannedData.success ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  getErrorIcon(scannedData.errorType)
                )}
                <div>
                  <h5 className="font-semibold text-white">
                    {scannedData.success ? 'Доступ разрешен' : 'Доступ запрещен'}
                  </h5>
                  {scannedData.error && (
                    <p className="text-gray-300 text-sm">{scannedData.error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          {scannedData.success ? (
            <div className="space-y-3">
              {/* Если день заморожен и можно разморозить */}
              {scannedData.isFrozenToday && scannedData.canUnfreeze && !isUnfrozen ? (
                <button
                  onClick={handleUnfreeze}
                  disabled={isUnfreezing}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isUnfreezing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Размораживаем...
                    </div>
                  ) : (
                    'Разморозить день'
                  )}
                </button>
              ) : (
                /* Обычные кнопки */
                <>
                  <button
                    onClick={handleMarkVisit}
                    disabled={isMarking}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isMarking ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Отмечаем...
                      </div>
                    ) : (
                      'Отметить посещение'
                    )}
                  </button>

                  {scannedData.canFreeze && (
                    <button
                      onClick={handleFreeze}
                      disabled={isFreezing}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {isFreezing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Замораживаем...
                        </div>
                      ) : (
                        'Заморозить день'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Кнопка закрыть при ошибке */
            <button
              onClick={onClose}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


