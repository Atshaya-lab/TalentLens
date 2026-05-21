import React from 'react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'active:scale-95 transform hover:scale-105',
      'shadow-sm hover:shadow-md',
    ];

    const variants = {
      primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 hover:shadow-emerald-300',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 shadow-gray-200 hover:shadow-gray-300',
      outline: 'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 hover:shadow-red-300',
      gradient: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200 hover:shadow-emerald-300',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 py-2 text-base',
      lg: 'h-13 px-8 text-lg',
    };

    const classes = cn(
      baseClasses,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    );

    return (
      <button
        className={classes}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="relative">
              <svg
                className="mr-2 h-4 w-4 animate-spin"
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
            </div>
            <span className="opacity-75">Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
            <span className="flex items-center">{children}</span>
            {rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
