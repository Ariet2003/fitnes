'use client';

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
  title?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, altText, title }: ImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Сброс состояния при открытии модала
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      {/* Заголовок и кнопки управления */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        {title && (
          <h3 className="text-white text-lg font-medium truncate mr-4">{title}</h3>
        )}
        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Уменьшить"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-sm bg-gray-800/80 px-2 py-1 rounded">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Увеличить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Повернуть"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Фон для закрытия */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Изображение */}
        <div 
          className="relative cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на изображение
          style={{ 
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-avatar.png'; // fallback изображение
            }}
          />
        </div>
      </div>

      {/* Подсказки для мобильных */}
      <div className="absolute bottom-4 left-4 right-4 text-center text-white/70 text-sm md:hidden">
        Потяните для перемещения • Дважды коснитесь для масштабирования
      </div>

      {/* Подсказки для десктопа */}
      <div className="absolute bottom-4 left-4 right-4 text-center text-white/70 text-sm hidden md:block">
        Колесо мыши для масштабирования • Перетащите для перемещения • ESC для закрытия
      </div>
    </div>
  );
}
