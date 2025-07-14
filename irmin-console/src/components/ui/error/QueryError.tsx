'use client';

import { CommonErrorDisplay } from './CommonErrorDisplay';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
  size?: 'lg' | 'md' | 'sm';
  showRefresh?: boolean;
}

/**
 * Universal error component for displaying query errors
 * Now using the modern error display for consistency
 */
export const QueryError = ({
  error,
  onRetry,
  title,
  description,
  className = '',
  size = 'md',
  showRefresh = true,
}: QueryErrorProps) => {
  const variant =
    size === 'sm' ? 'component' : size === 'lg' ? 'section' : 'component';

  return (
    <CommonErrorDisplay
      error={error}
      title={title}
      description={description}
      variant={variant}
      showDetails={false}
      showReload={showRefresh}
      showHome={false}
      showReport={false}
      onRetry={onRetry}
      className={className}
    />
  );
};
