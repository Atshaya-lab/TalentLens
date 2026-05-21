import React from 'react';
import { cn } from '../../utils/helpers';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className,
}) => {
  const sizes = {
    sm: { spinner: 'w-4 h-4', dots: 'w-2 h-2', text: 'text-sm' },
    md: { spinner: 'w-8 h-8', dots: 'w-3 h-3', text: 'text-base' },
    lg: { spinner: 'w-12 h-12', dots: 'w-4 h-4', text: 'text-lg' },
  };

  // Ensure size exists in sizes object, fallback to 'md'
  const currentSize = sizes[size] ? size : 'md';

  const renderSpinner = () => (
    <svg
      className={cn(
        'animate-spin text-blue-600',
        sizes[currentSize].spinner
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'bg-blue-600 rounded-full animate-pulse',
            sizes[currentSize].dots
          )}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  );

  const renderLoadingElement = () => {
    switch (variant) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      {renderLoadingElement()}
      {text && (
        <p className={cn('text-gray-600', sizes[currentSize].text)}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;
