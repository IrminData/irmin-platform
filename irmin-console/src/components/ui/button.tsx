'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

import Link from 'next/link';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const buttonVariants = cva(
  `
    inline-flex cursor-pointer appearance-none items-center justify-center
    rounded-md border-none text-sm font-normal whitespace-nowrap
    transition-[color,background-color,border-color,opacity]
    focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden
    disabled:pointer-events-none disabled:opacity-50
  `,
  {
    variants: {
      variant: {
        default: `
          bg-primary text-primary-foreground shadow-xs
          hover:bg-primary/80
        `,
        destructive: `
          bg-destructive text-destructive-foreground shadow-xs
          hover:bg-destructive/80
        `,
        outline: `
          border border-solid border-accent-foreground/50 text-foreground/90
          shadow-xs
          hover:bg-background hover:text-foreground
        `,
        secondary: `
          bg-secondary text-secondary-foreground shadow-xs
          hover:bg-secondary/80
        `,
        accent: `
          bg-accent text-accent-foreground shadow-xs
          hover:bg-accent/80
        `,
        gray: `
          bg-card text-card-foreground shadow-xs
          hover:bg-card/80
        `,
        ghost: 'hover:bg-accent/20',
        link: `
          text-foreground underline-offset-4
          hover:text-foreground/90 hover:underline
        `,
        gradient: `
          bg-linear-to-r from-irmin-green-700 to-irmin-green-600 text-white
          shadow-xs
          hover:opacity-80
        `,
      },
      size: {
        sm: 'h-9 rounded-md px-2 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 rounded-md px-4',
        icon: 'size-9',
      },
      iconFirst: {
        true: 'flex-row',
        false: 'flex-row-reverse',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      iconFirst: true,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  iconFirst?: boolean;
  href?: string;
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  prefetch?: boolean | null;
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      icon,
      loading = false,
      loadingText = 'Loading...',
      iconFirst = true,
      children,
      href,
      target,
      prefetch = null,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // asChild + href would require double-delegation through Slot → Link,
    // which we haven't wired up. No caller combines them today; fail loud
    // in dev if that changes so the first occurrence doesn't silently
    // drop the trigger's injected click/keyboard handlers.
    if (href && asChild && process.env.NODE_ENV !== 'production') {
      console.error(
        '[Button] `asChild` is ignored when `href` is set. ' +
          'If you need asChild behavior (e.g., DropdownMenuTrigger), ' +
          'wrap a plain <Link> instead.'
      );
    }

    const content = (
      <>
        {loading ? (
          <>
            <span
              className={`
                mr-2 inline-block size-4 animate-spin rounded-full border-2
                border-t-2 border-muted border-t-current
              `}
            />
            {size !== 'icon' && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {icon && size !== 'icon' && <span className={'mr-1'}>{icon}</span>}
            {icon && size === 'icon' && icon}
            {children}
          </>
        )}
      </>
    );

    const computedClassName = cn(
      buttonVariants({ variant, size, loading, iconFirst, className })
    );

    // When href is provided, render Link as the interactive root rather than
    // nesting <button> inside <Link>. Nesting an interactive element inside
    // another is invalid HTML and breaks keyboard, focus, and assistive
    // technology semantics on every CTA with href set. Native <a> handles
    // Cmd/Ctrl+click, middle-click, drag-to-tab without any extra code.
    if (href) {
      const isDisabled = loading || props.disabled;
      // Strip props that don't apply to an anchor (or that we handle via
      // ARIA below). type/disabled/form* are button-only.
      const {
        type: _type,
        disabled: _disabled,
        form: _form,
        formAction: _formAction,
        formEncType: _formEncType,
        formMethod: _formMethod,
        formNoValidate: _formNoValidate,
        formTarget: _formTarget,
        ...anchorProps
      } = props;

      return (
        <Link
          href={href}
          target={target}
          prefetch={prefetch}
          // Spread anchorProps FIRST so our computed disabled-state
          // attributes win over any caller-supplied tabIndex/aria-disabled.
          {...(anchorProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={cn(
            computedClassName,
            isDisabled && 'pointer-events-none opacity-50'
          )}
          aria-disabled={isDisabled || undefined}
          tabIndex={isDisabled ? -1 : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <Comp
        {...props}
        className={computedClassName}
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={loading || props.disabled}
        type={props.type || 'button'}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
