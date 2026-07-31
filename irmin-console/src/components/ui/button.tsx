'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

import Link from 'next/link';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const buttonVariants = cva(
  // Base — no global `border` width. Variants that need a visible stroke
  // include `border` alongside the color. Keeping borderless variants
  // (ghost, link, secondary) truly borderless avoids the 1px cream-tinted
  // phantom stroke that base.css `*` rules would otherwise apply.
  `
    inline-flex cursor-pointer appearance-none items-center justify-center
    rounded-[2px] text-sm font-medium tracking-tight whitespace-nowrap
    transition-[color,background-color,border-color,transform] duration-150
    ease-out
    focus-visible:outline-1 focus-visible:outline-offset-1
    focus-visible:outline-accent/70
    active:scale-[0.96]
    disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
    disabled:active:scale-100
  `,
  {
    variants: {
      variant: {
        // Default = soft muted fill, no border. Reads as a button (not
        // prose) without stacking stroke noise against adjacent chrome.
        // Middle ground between the bordered-pill (too loud) and the
        // fully-transparent ghost (too quiet — wizard CTAs were reading
        // as centered text rather than clickable actions).
        default: `
          bg-muted text-foreground
          hover:bg-secondary
        `,
        destructive: `
          border border-destructive bg-destructive text-destructive-foreground
          hover:bg-destructive/85
        `,
        // Use explicitly when a button needs to be recognizable as a
        // container (e.g., primary form action without brand weight).
        outline: `
          border border-border bg-transparent text-foreground
          hover:border-foreground/60 hover:bg-muted
        `,
        secondary: `
          bg-secondary text-secondary-foreground
          hover:bg-muted
        `,
        // Loud primary — the single filled variant. Use for brand-forward
        // CTAs ("Create …", "Commit", etc.).
        accent: `
          border border-accent bg-accent text-accent-foreground
          hover:bg-accent/85
        `,
        gray: `
          bg-card text-card-foreground
          hover:bg-muted
        `,
        ghost: `
          text-foreground
          hover:bg-muted
        `,
        link: `
          bg-transparent text-foreground underline decoration-accent
          decoration-1 underline-offset-[6px]
          hover:decoration-2
        `,
        // Legacy alias — identical to `accent`. DESIGN.md documents the
        // deprecation; kept so ~20 existing callers don't break.
        gradient: `
          border border-accent bg-accent text-accent-foreground
          hover:bg-accent/85
        `,
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        default: 'h-10 px-5',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'size-10',
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
            {icon && size !== 'icon' && (
              <span className='mr-1.5 inline-flex items-center'>{icon}</span>
            )}
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
