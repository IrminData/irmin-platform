'use client';

import React from 'react';

import { TbInbox } from 'react-icons/tb';

import Button from '@/components/ui/button';

interface EmptyStateProps {
  /**
   * The title of the empty state
   */
  title?: string;
  /**
   * The description/subtitle of the empty state
   */
  description?: string;
  /**
   * Custom icon to display (default is inbox icon)
   */
  icon?: React.ReactNode;
  /**
   * Action button configuration
   */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?:
      | 'default'
      | 'gradient'
      | 'secondary'
      | 'outline'
      | 'ghost'
      | 'link'
      | 'gray';
  };
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * EmptyState component for displaying when lists or content areas are empty
 *
 * @remarks
 * This component provides a consistent, sleek empty state across the application.
 * It includes an icon, title, description, and optional action button.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
  size = 'md',
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
  };

  const iconSizeClasses: Record<string, string> = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  const titleSizeClasses: Record<string, string> = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const descriptionSizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}
    >
      {/* Icon */}
      <div
        className={`${iconSizeClasses[size]} mb-4 text-gray-400 dark:text-gray-500`}
      >
        {icon || <TbInbox className='h-full w-full' />}
      </div>

      {/* Title */}
      {title && (
        <h3
          className={`mb-2 font-semibold text-gray-700 dark:text-gray-300 ${titleSizeClasses[size]}`}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          className={`mb-6 max-w-md text-gray-500 dark:text-gray-400 ${descriptionSizeClasses[size]}`}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <Button
          variant={action.variant || 'gradient'}
          onClick={action.onClick}
          href={action.href}
          className='mt-2'
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
