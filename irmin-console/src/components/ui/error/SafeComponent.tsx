'use client';

import type { ReactNode } from 'react';

import { ErrorBoundary } from './ErrorBoundary';

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'component' | 'page' | 'section';
  title?: string;
  description?: string;
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
  className = '',
  onError,
}: SafeComponentProps) {
  return (
    <ErrorBoundary
      level={level}
      title={title}
      description={description}
      className={className}
      fallback={fallback}
      onError={onError ? (error, _errorInfo) => onError(error) : undefined}
    >
      {children}
    </ErrorBoundary>
  );
}
