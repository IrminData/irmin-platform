'use client';

import type { ComponentProps, ReactNode } from 'react';

import { ErrorBoundary } from './ErrorBoundary';

type ErrorBoundaryProps = ComponentProps<typeof ErrorBoundary>;

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'component' | 'page' | 'section';
  title?: string;
  description?: string;
  titleKey?: ErrorBoundaryProps['titleKey'];
  descriptionKey?: ErrorBoundaryProps['descriptionKey'];
  className?: string;
  onError?: (error: Error) => void;
}

/**
 * Safe Component wrapper that provides error boundary functionality
 *
 * This is a functional wrapper around the proper ErrorBoundary class component.
 * It provides the same API as before but uses the correct React error boundary
 * implementation underneath.
 */
export default function SafeComponent({
  children,
  fallback,
  level = 'component',
  title,
  description,
  titleKey,
  descriptionKey,
  className = '',
  onError,
}: SafeComponentProps) {
  return (
    <ErrorBoundary
      level={level}
      title={title}
      description={description}
      titleKey={titleKey}
      descriptionKey={descriptionKey}
      className={className}
      fallback={fallback}
      onError={onError ? (error, _errorInfo) => onError(error) : undefined}
    >
      {children}
    </ErrorBoundary>
  );
}
