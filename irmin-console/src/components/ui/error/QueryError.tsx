'use client';

import { TbAlertCircle, TbRefresh } from 'react-icons/tb';

import { Button } from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showRefresh?: boolean;
}

/**
 * Universal error component for displaying query errors
 */
export function QueryError({
  error,
  onRetry,
  title,
  description,
  className = '',
  size = 'md',
  showRefresh = true,
}: QueryErrorProps) {
  const { dict } = useLocale();

  const sizeClasses = {
    sm: 'p-4 gap-2',
    md: 'p-6 gap-3',
    lg: 'p-8 gap-4',
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28,
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}
    >
      <div className='text-destructive mb-2'>
        <TbAlertCircle size={iconSizes[size]} />
      </div>

      <h3 className={`text-foreground font-semibold ${textSizes[size]}`}>
        {title || dict.common.error}
      </h3>

      {(description || error?.message) && (
        <p
          className={`text-foreground/70 max-w-md ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
        >
          {description || error?.message || dict.common.somethingWentWrong}
        </p>
      )}

      {showRefresh && onRetry && (
        <Button
          variant='outline'
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={onRetry}
          className='mt-3'
          icon={<TbRefresh size={16} />}
        >
          {dict.common.tryAgain}
        </Button>
      )}
    </div>
  );
}

export default QueryError;
