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

/**
 * Underline-only form input (Almanac style). The outer wrapper owns the
 * hairline + focus-accent treatment; the inner <input>/<textarea> stays
 * unstyled so the underline tracks text width consistently.
 *
 * If the surrounding UI needs a boxed input (e.g., data-sheet grid cell
 * editors), pass a `className` override on the wrapper to reintroduce a
 * box — those are functional, not aesthetic, per DESIGN.md.
 */
const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    { className, type = 'text', icon, loading = false, longtext, ...props },
    ref
  ) => {
    const baseClasses = `
      relative inline-flex w-full items-center justify-center border-0
      border-b border-input bg-transparent
      transition-colors duration-150
      focus-within:border-accent
      aria-[invalid=true]:border-destructive
      has-[input:disabled]:pointer-events-none
      has-[input:disabled]:opacity-50
      has-[textarea:disabled]:pointer-events-none
      has-[textarea:disabled]:opacity-50
    `;

    const combinedClasses = cn(baseClasses, className, icon ? 'min-w-32' : '');

    if (longtext) {
      // Textarea doesn't support type attribute, so we need to handle password masking separately
      const isPassword = type === 'password';
      const textareaProps =
        props as TextareaHTMLAttributes<HTMLTextAreaElement>;

      return (
        <div className={combinedClasses}>
          {icon && (
            <span className='absolute left-0 text-sm text-muted-foreground'>
              {icon}
            </span>
          )}
          <textarea
            className={cn(
              `
                w-full bg-transparent py-2 pr-1
                placeholder:text-muted-foreground/70
                focus:outline-hidden
              `,
              icon ? 'pl-8' : 'pl-0'
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
            <div className='absolute right-0'>
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
        {icon && (
          <span className='absolute left-0 text-sm text-muted-foreground'>
            {icon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            `
              w-full bg-transparent py-2.5 pr-1 text-[1rem]
              placeholder:text-muted-foreground/70
              focus:outline-hidden
            `,
            icon ? 'pl-8' : 'pl-0'
          )}
          ref={ref as Ref<HTMLInputElement>}
          {...props}
        />
        {loading && (
          <div className='absolute right-0'>
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
