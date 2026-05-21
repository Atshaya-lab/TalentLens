import React from 'react';
import { cn } from '../../utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const { isDark } = useTheme();
    
    const variants = {
      default: isDark 
        ? 'bg-gray-800 border border-gray-700' 
        : 'bg-white border border-gray-200',
      elevated: isDark 
        ? 'bg-gray-800 shadow-lg border border-gray-600' 
        : 'bg-white shadow-lg border border-gray-100',
      outlined: isDark 
        ? 'bg-gray-800 border-2 border-gray-600' 
        : 'bg-white border-2 border-gray-300',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    const { isDark } = useTheme();
    return (
      <h3
        ref={ref}
        className={cn(
          'font-semibold leading-none tracking-tight text-lg',
          isDark ? 'text-gray-100' : 'text-gray-900',
          className
        )}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    const { isDark } = useTheme();
    return (
      <p
        ref={ref}
        className={cn(
          'text-sm',
          isDark ? 'text-gray-400' : 'text-gray-500',
          className
        )}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

// Create a compound component for easier usage
const CompoundCard = Object.assign(Card, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
  Title: CardTitle,
  Description: CardDescription,
});

export default CompoundCard;
