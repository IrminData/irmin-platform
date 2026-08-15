'use client';

import type { FC, ReactNode } from 'react';

import { TbInbox } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import type { EmptyStateAction } from '@/types/internal/ListProps';

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
  icon?: ReactNode;
  /**
   * Action button configuration
   */
  action?: EmptyStateAction;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   */
  size?: 'lg' | 'md' | 'sm';
  /**
   * Whether to hide the action button
   */
  hideActionButton?: boolean;
}

/**
 * EmptyState component for displaying when lists or content areas are empty
 *
 * @remarks
 * This component provides a consistent, sleek empty state across the application.
 * It includes an icon, title, description, and optional action button.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  hideActionButton = false,
  className = '',
  size = 'md',
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-5',
    md: 'px-4 py-10',
    lg: 'px-6 py-14',
  };

  const iconSizeClasses: Record<string, string> = {
    sm: 'size-7',
    md: 'size-9',
    lg: 'size-11',
  };

  const titleSizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const descriptionSizeClasses: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Icon */}
      <div
        aria-hidden='true'
        className={`
          ${iconSizeClasses[size]}
          mb-4 text-muted-foreground
        `}
      >
        {icon || <TbInbox className='size-full' strokeWidth={1.5} />}
      </div>

      {/* Title */}
      {title && (
        <h3
          className={`
            mb-2 font-semibold text-balance text-foreground
            ${titleSizeClasses[size]}
          `}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          className={`
            mb-6 max-w-prose leading-relaxed text-pretty text-muted-foreground
            ${descriptionSizeClasses[size]}
          `}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && !hideActionButton && (
        <Button
          variant={action.variant || 'accent'}
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
