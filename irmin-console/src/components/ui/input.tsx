'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';

import { cn } from '@/utils/tw';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
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
      'relative inline-flex w-full items-center justify-center rounded-md border border-input bg-transparent shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

    const combinedClasses = cn(baseClasses, className, icon ? 'min-w-32' : '');

    if (longtext) {
      // Textarea doesn't support type attribute, so we need to handle password masking separately
      const isPassword = type === 'password';
      const textareaProps =
        props as TextareaHTMLAttributes<HTMLTextAreaElement>;

      return (
        <div className={combinedClasses}>
          {icon && <span className='absolute left-3 text-sm'>{icon}</span>}
          <textarea
            className={cn(
              `
                w-full bg-transparent py-2 pr-1
                focus:outline-hidden
              `,
              icon ? 'pl-10' : 'pl-3'
            )}
            style={
              isPassword
                ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                : undefined
            }
            ref={ref as Ref<HTMLTextAreaElement>}
            rows={longtext.rows}
            {...textareaProps}
          />
          {loading && (
            <div className='absolute right-3'>
              <div
                className={`
                  inline size-4 animate-spin rounded-full border-2 border-t-2
                  border-muted-foreground
                `}
              />
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
            `
              w-full bg-transparent py-2 pr-1
              focus:outline-hidden
            `,
            icon ? 'pl-10' : 'pl-3'
          )}
          ref={ref as Ref<HTMLInputElement>}
          {...props}
        />
        {loading && (
          <div className='absolute right-3'>
            <div
              className={`
                inline size-4 animate-spin rounded-full border-2 border-t-2
                border-muted-foreground
              `}
            />
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
