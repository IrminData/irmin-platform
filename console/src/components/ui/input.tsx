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
      transition-[border-color,border-width] duration-150
      focus-within:border-b-2 focus-within:border-accent
      has-[input:disabled]:pointer-events-none
      has-[input:disabled]:opacity-50
      has-[textarea:disabled]:pointer-events-none
      has-[textarea:disabled]:opacity-50
    `;

    const invalid =
      props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    const combinedClasses = cn(
      baseClasses,
      className,
      icon ? 'min-w-32' : '',
      invalid &&
        `
          border-destructive
          focus-within:border-destructive
        `
    );

    if (longtext) {
      // Textarea doesn't support type attribute, so we need to handle password masking separately
      const isPassword = type === 'password';
      const textareaProps =
        props as TextareaHTMLAttributes<HTMLTextAreaElement>;

      return (
        <div className={combinedClasses} aria-busy={loading || undefined}>
          {icon && (
            <span
              aria-hidden='true'
              className='
                pointer-events-none absolute inset-s-0 text-sm
                text-muted-foreground
              '
            >
              {icon}
            </span>
          )}
          <textarea
            className={cn(
              `
                field-sizing-content min-h-24 w-full resize-y bg-transparent
                py-2 pe-1 text-base
                placeholder:text-muted-foreground/70
                focus:outline-hidden
                md:text-sm
              `,
              icon ? 'ps-8' : 'ps-0'
            )}
            style={
              isPassword
                ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                : undefined
            }
            ref={ref as Ref<HTMLTextAreaElement>}
            {...textareaProps}
            rows={longtext.rows}
            aria-busy={loading || undefined}
          />
          {loading && (
            <div aria-hidden='true' className='absolute inset-e-0'>
              <div
                className={`
                  inline size-4 animate-spin rounded-full border-2 border-t-2
                  border-muted border-t-current text-muted-foreground
                `}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={combinedClasses} aria-busy={loading || undefined}>
        {icon && (
          <span
            aria-hidden='true'
            className='
              pointer-events-none absolute inset-s-0 text-sm
              text-muted-foreground
            '
          >
            {icon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            `
              w-full bg-transparent py-2.5 pe-1 text-base
              placeholder:text-muted-foreground/70
              focus:outline-hidden
              md:text-sm
            `,
            icon ? 'ps-8' : 'ps-0'
          )}
          ref={ref as Ref<HTMLInputElement>}
          {...props}
          aria-busy={loading || undefined}
        />
        {loading && (
          <div aria-hidden='true' className='absolute inset-e-0'>
            <div
              className={`
                inline size-4 animate-spin rounded-full border-2 border-t-2
                border-muted border-t-current text-muted-foreground
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
