'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils/twUtils';

import { useLocale } from '@/context/LocaleContext';

/**
 * Universal button component, used across the application
 */
const Button: React.FC<{
  variant?: 'solid' | 'outline' | 'icon' | 'link';
  colorScheme?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'gray'
    | 'black'
    | 'light';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top' | 'framename';
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({
  variant,
  colorScheme,
  size = 'md',
  href,
  target = '_self',
  onClick,
  disabled = false,
  loading = false,
  icon,
  children,
  className = '',
  ariaLabel,
  type = 'button',
}) => {
  const { dict } = useLocale();
  const router = useRouter();

  const baseClasses =
    'inline-flex items-center justify-center rounded-lg transition-all outline-none';
  const variantClasses = {
    solid: {
      primary:
        'bg-irmin_green-500 text-white hover:bg-irmin_green-400 shadow active:bg-irmin_green-600',
      secondary:
        'bg-irmin_blue text-white hover:bg-irmin_blue-400 shadow active:bg-irmin_blue-600',
      tertiary:
        'bg-irmin_teal text-white hover:bg-irmin_teal-400 shadow active:bg-irmin_teal-600',
      gray: 'bg-gray-500 text-white hover:bg-gray-400 shadow active:bg-gray-600',
      black:
        'bg-irmin_black text-white hover:bg-irmin_black-400 shadow active:bg-irmin_black-600',
      light:
        'bg-gray-100 text-black hover:bg-gray-200 shadow active:bg-gray-300',
    },
    outline: {
      primary:
        'border border-irmin_green-500 text-irmin_green-500 hover:bg-white hover:text-irmin_green-400 hover:border-irmin_green-400 shadow active:shadow-md',
      secondary:
        'border border-irmin_blue text-irmin_blue hover:bg-white hover:text-irmin_blue-400 hover:border-irmin_blue-400 shadow active:shadow-md',
      tertiary:
        'border border-irmin_teal text-irmin_teal hover:bg-white hover:text-irmin_teal-400 hover:border-irmin_teal-400 shadow active:shadow-md',
      gray: 'border border-gray-500 text-gray-500 hover:bg-white hover:text-gray-400 hover:border-gray-400 shadow',
      black:
        'border border-irmin_black text-irmin_black hover:bg-white hover:text-irmin_black-400 hover:border-irmin_black-400 shadow active:shadow-md',
      light:
        'border border-gray-200 text-gray-100 hover:bg-white hover:text-gray-400 hover:border-gray-400 shadow active:shadow-md',
    },
    icon: {
      primary:
        'text-irmin_green-500 hover:text-irmin_green-400 rounded-full active:text-irmin_green-600',
      secondary:
        'text-irmin_blue-500 hover:text-irmin_blue-400 rounded-full active:text-irmin_blue-600',
      tertiary:
        'text-irmin_teal-500 hover:text-irmin_teal-400 rounded-full active:text-irmin_teal-600',
      gray: 'text-gray-500 hover:text-gray-400 rounded-full active:text-gray-600',
      black:
        'text-irmin_black hover:text-irmin_black-400 rounded-full active:text-irmin_black-600',
      light:
        'text-gray-200 hover:text-gray-400 rounded-full active:text-gray-300',
    },
    link: {
      primary:
        'text-irmin_green-500 hover:underline shadow-none active:text-irmin_green-600',
      secondary:
        'text-irmin_blue hover:underline shadow-none active:text-irmin_blue-600',
      tertiary:
        'text-irmin_teal hover:underline shadow-none active:text-irmin_teal-600',
      gray: 'text-gray-500 hover:underline shadow-none active:text-gray-600',
      black:
        'text-irmin_black hover:underline shadow-none active:text-irmin_black-600',
      light: 'text-gray-200 hover:underline shadow-none active:text-gray-300',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 w-fit min-h-8 text-xs font-light lg:px-3 lg:text-sm lg:min-h-10',
    md: 'px-3 py-1 w-fit min-h-11 text-sm font-normal lg:px-4 lg:text-base lg:min-h-14',
    lg: 'px-4 py-2 w-fit min-h-14 text-base font-normal lg:px-6 lg:min-h-16',
  };

  let combinedClasses = `${baseClasses} ${sizeClasses[size]} ${icon ? 'min-w-32 ' : ''}${disabled ? 'opacity-50 cursor-not-allowed ' : ''} ${className}`;
  if (variant) {
    if (colorScheme) {
      combinedClasses = `${variantClasses[variant][colorScheme]} ${combinedClasses}`;
    } else {
      combinedClasses = `${variantClasses[variant].primary} ${combinedClasses}`;
    }
  }

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    if (disabled || loading) return;
    if (onClick) onClick(e);
    if (href && !e.defaultPrevented) router.push(href);
  };

  if (href && !disabled) {
    return (
      <Link
        href={loading ? '' : href}
        className={cn(combinedClasses.split(' '))}
        onClick={handleClick}
        aria-label={ariaLabel}
        target={target}
      >
        {loading ? (
          <>
            <div className='mr-2 inline h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-irmin_green-200 border-t-irmin_green'></div>
            <span>{dict.misc.loading}</span>
          </>
        ) : (
          <>
            {icon && <span className='mr-1'>{icon}</span>}
            {children}
          </>
        )}
      </Link>
    );
  }

  return (
    <button
      className={cn(combinedClasses.split(' '))}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type={type}
    >
      {loading ? (
        <>
          <div className='mr-2 inline h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-irmin_green-200 border-t-irmin_green'></div>
          <span>{dict.misc.loading}</span>
        </>
      ) : (
        <>
          {icon && <span className='mr-1'>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
