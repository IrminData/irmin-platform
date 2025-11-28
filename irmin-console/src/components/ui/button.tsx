'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

import Link from 'next/link';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const buttonVariants = cva(
  `
    inline-flex cursor-pointer appearance-none items-center justify-center
    rounded-md border-none text-sm font-normal whitespace-nowrap transition-all
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

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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

    const content = (
      <>
        {loading ? (
          <>
            <span
              className={`
                mr-2 inline-block size-4 animate-spin rounded-full border-2
                border-t-2 border-gray-200 border-t-current
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

    const buttonProps = {
      className: cn(
        buttonVariants({ variant, size, loading, iconFirst, className })
      ),
      ref,
      disabled: loading || props.disabled,
      ...props,
    };

    if (href) {
      return (
        <Link href={href} target={target} prefetch={prefetch}>
          <Comp {...buttonProps}>{content}</Comp>
        </Link>
      );
    }

    return (
      <Comp {...buttonProps} type={props.type || 'button'}>
        {content}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
