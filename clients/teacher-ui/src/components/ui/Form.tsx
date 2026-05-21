import React, { ReactNode } from 'react';
import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import Button from './Button';
import Input from './Input';

interface FormProps<T extends FieldValues> {
  schema: Yup.ObjectSchema<any>;
  onSubmit: (data: T) => void | Promise<void>;
  children: (methods: UseFormReturn<T>) => ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  className = '',
  isLoading = false,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: yupResolver(schema) as any,
    mode: 'onChange',
  });

  const handleSubmit = methods.handleSubmit(async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  });

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {children(methods)}
    </form>
  );
}

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  methods: UseFormReturn<T>;
  required?: boolean;
  disabled?: boolean;
}

export function FormField<T extends FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  options,
  methods,
  required = false,
  disabled = false,
}: FormFieldProps<T>) {
  const { register, formState: { errors } } = methods;
  const error = errors[name]?.message as string;

  if (type === 'select' && options) {
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id={name}
          {...register(name)}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id={name}
          {...register(name)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-vertical ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        {...register(name)}
      />
    </div>
  );
}

interface FormButtonProps {
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  type?: 'submit' | 'button';
}

export function FormButton({
  children,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  type = 'submit',
}: FormButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      isLoading={isLoading}
      disabled={disabled}
      className="w-full"
    >
      {children}
    </Button>
  );
}

// Export compound component
Form.Field = FormField;
Form.Button = FormButton;
