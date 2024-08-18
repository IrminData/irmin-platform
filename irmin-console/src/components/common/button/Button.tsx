'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

type ButtonColorScheme =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'gray'
  | 'black'
  | 'light';

/**
 * Universal button component, used across the application
 *
 * @param buttonProps - The button properties
 * @param buttonProps.variant - The button variant
 * @param buttonProps.colorScheme - The button color scheme
 * @param buttonProps.size - The button size
 * @param buttonProps.href - The button href, if it is a link
 * @param buttonProps.target - The button link target
 * @param buttonProps.onClick - The button onClick function
 * @param buttonProps.disabled - The button disabled state
 * @param buttonProps.loading - The button loading state
 * @param buttonProps.icon - The button icon
 * @param buttonProps.iconFirst - The button icon position, either first or last
 * @param buttonProps.children - The button children, either text or a component
 * @param buttonProps.className - The button class name, to be used for custom styling
 * @param buttonProps.ariaLabel - The button aria label
 * @param buttonProps.type - The button type, either button, submit or reset
 *
 * @returns The button component
 */
const Button = ({
  variant,
  colorScheme,
  size = 'md',
  href,
  target = '_self',
  onClick,
  disabled = false,
  loading = false,
  icon,
  iconFirst = true,
  children,
  className = '',
  ariaLabel,
  type = 'button',
}: {
  variant?: 'solid' | 'outline' | 'gradient' | 'icon' | 'link';
  colorScheme?: ButtonColorScheme;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top' | 'framename';
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconFirst?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const { dict } = useLocale();
  const router = useRouter();

  const baseClasses =
    'inline-flex items-center justify-center text-center rounded-lg transition-all outline-none hover:opacity-60 duration-300 hover:backdrop-blur shadow shadow-gray-300 dark:shadow-gray-700';
  const variantClasses = {
    solid: {
      primary: 'bg-irmin_green text-white active:bg-irmin_green-600',
      secondary: 'bg-irmin_blue text-white active:bg-irmin_blue-600',
      tertiary: 'bg-irmin_teal text-white active:bg-irmin_teal-600',
      gray: 'bg-gray-500 text-white active:bg-gray-600',
      black: 'bg-irmin_black text-white active:bg-irmin_black-600',
      light: 'bg-gray-100 text-black active:bg-gray-300',
    },
    outline: {
      primary: 'border border-irmin_green text-irmin_green',
      secondary: 'border border-irmin_blue text-irmin_blue',
      tertiary: 'border border-irmin_teal text-irmin_teal',
      gray: 'border border-gray-500 text-gray-500',
      black: 'border border-irmin_black text-irmin_black',
      light: 'border border-gray-200 text-gray-100',
    },
    gradient: {
      primary:
        'bg-gradient-to-r from-irmin_green-600 to-irmin_green-400 text-white',
      secondary:
        'bg-gradient-to-r from-irmin_blue to-irmin_blue-400 text-white',
      tertiary: 'bg-gradient-to-r from-irmin_teal to-irmin_teal-400 text-white',
      gray: 'bg-gradient-to-r from-gray-500 to-gray-400 text-white',
      black: 'bg-gradient-to-r from-irmin_black to-irmin_black-400 text-white',
      light: 'bg-gradient-to-r from-gray-100 to-gray-200 text-black',
    },
    icon: {
      primary: 'text-irmin_green rounded-full active:text-irmin_green-600',
      secondary: 'text-irmin_blue rounded-full active:text-irmin_blue-600',
      tertiary: 'text-irmin_teal-500 rounded-full active:text-irmin_teal-600',
      gray: 'text-gray-500 rounded-full active:text-gray-600',
      black: 'text-irmin_black rounded-full active:text-irmin_black-600',
      light: 'text-gray-200 rounded-full active:text-gray-300',
    },
    link: {
      primary:
        'text-irmin_green hover:underline shadow-none active:text-irmin_green-600',
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

  const iconSizeClasses = {
    sm: 'pr-1',
    md: 'pr-2',
    lg: 'pr-3',
  };

  let combinedClasses = `${baseClasses} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed ' : ''} ${className}`;
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

  if (href) {
    return (
      <Link
        href={loading || disabled ? '' : href}
        className={cn(combinedClasses.split(' '))}
        onClick={(e) => !disabled && !loading && handleClick(e)}
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
            {icon && iconFirst && (
              <span className={iconSizeClasses[size]}>{icon}</span>
            )}
            {children}
            {icon && !iconFirst && (
              <span className={iconSizeClasses[size]}>{icon}</span>
            )}
          </>
        )}
      </Link>
    );
  }

  return (
    <button
      className={cn(combinedClasses.split(' '))}
      onClick={(e) => !disabled && !loading && handleClick(e)}
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
          {icon && iconFirst && (
            <span className={iconSizeClasses[size]}>{icon}</span>
          )}
          {children}
          {icon && !iconFirst && (
            <span className={iconSizeClasses[size]}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;
