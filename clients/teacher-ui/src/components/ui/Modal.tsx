import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const { isDark } = useTheme();
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative rounded-lg shadow-xl w-full',
          isDark ? 'bg-gray-800' : 'bg-white',
          sizes[size],
          'max-h-[90vh] overflow-hidden flex flex-col'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={cn(
            'flex items-center justify-between p-6 border-b',
            isDark ? 'border-gray-700' : 'border-gray-200'
          )}>
            <div>
              {title && (
                <h2 className={cn(
                  'text-xl font-semibold',
                  isDark ? 'text-gray-100' : 'text-gray-900'
                )}>
                  {title}
                </h2>
              )}
              {description && (
                <p className={cn(
                  'mt-1 text-sm',
                  isDark ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'transition-colors',
                  isDark 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
