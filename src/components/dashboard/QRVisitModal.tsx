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
    };
    visitTime?: string;
    workingHours?: {
      start: string;
      end: string;
    };
  } | null;
  onMarkVisit: () => void;
}

export default function QRVisitModal({ 
  isOpen, 
  onClose, 
  scannedData,
  onMarkVisit 
}: QRVisitModalProps) {
  const [isMarking, setIsMarking] = useState(false);

  if (!isOpen || !scannedData) return null;

  const handleMarkVisit = async () => {
    setIsMarking(true);
    try {
      await onMarkVisit();
    } finally {
      setIsMarking(false);
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
        return 'border-orange-500 bg-orange-50';
      case 'ALREADY_VISITED_TODAY':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-red-500 bg-red-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Сканирование QR-кода</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {scannedData.success ? (
            /* Успешное сканирование */
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <h4 className="text-xl font-semibold text-gray-800 mb-2">
                  Клиент найден
                </h4>
              </div>

              {/* Фото клиента */}
              <div className="mb-6">
                {scannedData.client?.photoUrl ? (
                  <div className="w-24 h-24 mx-auto mb-3">
                    <Image
                      src={scannedData.client.photoUrl}
                      alt={scannedData.client.fullName}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover rounded-full border-4 border-green-500"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center border-4 border-green-500">
                    <User className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Информация о клиенте */}
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">Имя клиента</div>
                  <div className="font-semibold text-gray-800">
                    {scannedData.client?.fullName}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">Телефон</div>
                  <div className="font-medium text-gray-700">
                    {scannedData.client?.phone}
                  </div>
                </div>

                {scannedData.subscription && (
                  <>
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Тариф</div>
                      <div className="font-medium text-gray-700">
                        {scannedData.subscription.tariffName}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Действует до</div>
                      <div className="font-medium text-gray-700">
                        {new Date(scannedData.subscription.endDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Осталось дней</div>
                      <div className="font-semibold text-green-600">
                        {scannedData.subscription.remainingDays}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Кнопка отметить */}
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
            </div>
          ) : (
            /* Ошибка при сканировании */
            <div className="text-center">
              <div className="mb-4">
                {getErrorIcon(scannedData.errorType)}
              </div>

              <div className={`border-2 rounded-lg p-4 mb-6 ${getErrorColor(scannedData.errorType)}`}>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Доступ запрещен
                </h4>
                <p className="text-gray-700 mb-4">
                  {scannedData.error}
                </p>

                {/* Дополнительная информация */}
                {scannedData.client && (
                  <div className="text-left bg-white rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      {scannedData.client.fullName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {scannedData.client.phone}
                    </div>
                  </div>
                )}

                {/* Время работы */}
                {scannedData.workingHours && (
                  <div className="text-sm text-gray-600">
                    Время работы: {scannedData.workingHours.start} - {scannedData.workingHours.end}
                  </div>
                )}

                {/* Время последнего посещения */}
                {scannedData.visitTime && (
                  <div className="text-sm text-gray-600">
                    Посещение: {new Date(scannedData.visitTime).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
