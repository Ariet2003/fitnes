'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string, customStart?: Date, customEnd?: Date) => void;
}

export default function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const periodOptions = [
    { value: '7d', label: '7 дней' },
    { value: '30d', label: '30 дней' },
    { value: '3m', label: '3 месяца' },
    { value: '6m', label: '6 месяцев' },
    { value: '1y', label: '1 год' },
    { value: 'custom', label: 'Выбрать период' }
  ];

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      onPeriodChange(value);
    }
  };

  const handleCustomPeriodApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      
      if (startDate <= endDate) {
        onPeriodChange('custom', startDate, endDate);
        setShowCustomPicker(false);
      }
    }
  };

  const getCurrentPeriodLabel = () => {
    const option = periodOptions.find(opt => opt.value === period);
    return option ? option.label : 'Выбранный период';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg">
        <Calendar className="w-4 h-4 text-gray-400 ml-3" />
        
        <select
          value={period === 'custom' ? 'custom' : period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="bg-transparent text-white text-sm border-none outline-none cursor-pointer py-2 pr-8 pl-2 appearance-none"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
        </select>
        
        <ChevronDown className="w-4 h-4 text-gray-400 mr-3 pointer-events-none" />
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomPicker && (
        <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl z-50 min-w-[300px]">
          <h4 className="text-white font-medium mb-3">Выберите период</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Начальная дата</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Конечная дата</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCustomPeriodApply}
              disabled={!customStartDate || !customEndDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Применить
            </button>
            <button
              onClick={() => setShowCustomPicker(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
