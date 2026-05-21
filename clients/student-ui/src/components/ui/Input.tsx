import React from 'react';
import { cn } from '../../utils/helpers';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    ...props
  }, ref) => {
    const inputClasses = cn(
      'flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm',
      'placeholder:text-neutral-400',
      'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
      'hover:border-neutral-300 transition-colors duration-200',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',
      error && 'border-error-500 focus:ring-error-500',
      leftIcon && 'pl-11',
      rightIcon && 'pr-11',
      fullWidth && 'w-full',
      className
    );

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-neutral-700 mb-1 block">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-neutral-400">{leftIcon}</span>
            </div>
          )}
          <input
            type={type}
            className={inputClasses}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-neutral-400">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-error-600 mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-neutral-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
