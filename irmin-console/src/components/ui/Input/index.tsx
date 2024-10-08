'use client';

import React, { forwardRef } from 'react';

import { cn } from '@/utils/tw';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  loading?: boolean;
  longtext?: {
    rows: number;
  };
}

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    { className, type = 'text', icon, loading = false, longtext, ...props },
    ref
  ) => {
    const baseClasses =
      'relative inline-flex w-full items-center justify-center rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

    const combinedClasses = cn(baseClasses, className, icon ? 'min-w-32' : '');

    if (longtext) {
      return (
        <div className={combinedClasses}>
          {icon && <span className='absolute left-3 text-sm'>{icon}</span>}
          <textarea
            className={cn(
              'w-full bg-transparent py-2 pr-1 focus:outline-none',
              icon ? 'pl-10' : 'pl-3'
            )}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={longtext.rows}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
          {loading && (
            <div className='absolute right-3'>
              <div className='inline h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-muted-foreground'></div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={combinedClasses}>
        {icon && <span className='absolute left-3 text-sm'>{icon}</span>}
        <input
          type={type}
          className={cn(
            'w-full bg-transparent py-2 pr-1 focus:outline-none',
            icon ? 'pl-10' : 'pl-3'
          )}
          ref={ref as React.Ref<HTMLInputElement>}
          {...props}
        />
        {loading && (
          <div className='absolute right-3'>
            <div className='inline h-4 w-4 animate-spin rounded-full border-2 border-t-2 border-muted-foreground'></div>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
