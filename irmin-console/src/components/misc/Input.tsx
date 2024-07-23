'use client';

import React from 'react';

import { cn } from '@/lib/utils/twUtils';

const Input: React.FC<{
  variant?: 'solid' | 'outline' | 'underline';
  colorScheme?: 'primary' | 'secondary' | 'tertiary' | 'gray' | 'black';
  size?: 'sm' | 'md' | 'lg';
  name?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  id?: string;
  required?: boolean;
}> = ({
  variant,
  colorScheme,
  size = 'md',
  name = '',
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled = false,
  loading = false,
  icon,
  className = '',
  ariaLabel = '',
  type = 'text',
  id = '',
  required = false,
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center rounded-lg transition-all focus:outline-none';
  const variantClasses = {
    solid: {
      primary:
        'bg-white border border-irmin_green-500 text-irmin_green-900 placeholder-gray-300 shadow',
      secondary:
        'bg-white border border-irmin_blue-500 text-irmin_blue-900 placeholder-gray-300 shadow',
      tertiary:
        'bg-white border border-irmin_teal-500 text-irmin_teal-900 placeholder-gray-300 shadow',
      gray: 'border border-gray-500 text-gray-900 placeholder-gray-300 shadow',
      black:
        'bg-white border border-irmin_black text-irmin_black placeholder-gray-300 shadow',
    },
    outline: {
      primary:
        'border border-irmin_green-500 text-irmin_green-900 placeholder-gray-300 shadow',
      secondary:
        'border border-irmin_blue-500 text-irmin_blue-900 placeholder-gray-300 shadow',
      tertiary:
        'border border-irmin_teal-500 text-irmin_teal-900 placeholder-gray-300 shadow',
      gray: 'border border-gray-500 text-gray-900 placeholder-gray-300 shadow',
      black:
        'border border-irmin_black text-irmin_black placeholder-gray-300 shadow',
    },
    underline: {
      primary:
        'border-b border-irmin_green-500 text-irmin_green-900 placeholder-gray-300 shadow',
      secondary:
        'border-b border-irmin_blue-500 text-irmin_blue-900 placeholder-gray-300 shadow',
      tertiary:
        'border-b border-irmin_teal-500 text-irmin_teal-900 placeholder-gray-300 shadow',
      gray: 'border-b border-gray-500 text-gray-900 placeholder-gray-300 shadow',
      black:
        'border-b border-irmin_black text-irmin_black placeholder-gray-300 shadow',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 min-h-8 text-xs font-light lg:px-3 lg:text-sm lg:min-h-10',
    md: 'px-3 py-1 min-h-11 text-sm font-normal lg:px-4 lg:text-base lg:min-h-14',
    lg: 'px-4 py-2 min-h-14 text-base font-normal lg:px-6 lg:min-h-16',
  };

  let combinedClasses = `${baseClasses} ${sizeClasses[size]} ${icon ? 'min-w-32 ' : ''}${disabled ? 'opacity-50 cursor-not-allowed ' : ''} ${className}`;
  if (variant) {
    if (colorScheme) {
      combinedClasses = `${variantClasses[variant][colorScheme]} ${combinedClasses}`;
    } else {
      combinedClasses = `${variantClasses[variant].primary} ${combinedClasses}`;
    }
  }
  return (
    <div className={cn(combinedClasses.split(' '))}>
      {icon && <span className='absolute left-3 text-sm'>{icon}</span>}
      <input
        type={type}
        className={`w-full ${icon ? 'pl-10' : 'pl-1'} bg-transparent py-2 pr-1 focus:outline-none`}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        id={id}
        required={required}
        placeholder={placeholder}
        name={name}
        defaultValue={defaultValue}
        value={value}
      />
      {loading && (
        <div className='absolute right-3'>
          <div className='inline h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-irmin_green-200 border-t-irmin_green'></div>
        </div>
      )}
    </div>
  );
};

export default Input;
