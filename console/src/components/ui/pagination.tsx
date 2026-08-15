import type { ComponentProps } from 'react';

import { TbChevronLeft, TbChevronRight, TbDots } from 'react-icons/tb';

import type { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';

import { cn } from '@/utils/tw';

type PaginationProps = ComponentProps<'nav'> & {
  label: string;
};

function Pagination({ className, label, ...props }: PaginationProps) {
  return (
    <nav
      aria-label={label}
      data-slot='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot='pagination-content'
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: ComponentProps<'li'>) {
  return <li data-slot='pagination-item' {...props} />;
}

type PaginationLinkProps = Pick<ComponentProps<typeof Button>, 'size'> &
  Omit<ComponentProps<'button'>, 'size'> & {
    isActive?: boolean;
  };

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  type = 'button',
  ...props
}: PaginationLinkProps) {
  return (
    <button
      {...props}
      type={type}
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className
      )}
    >
      {props.children}
    </button>
  );
}

type PaginationDirectionProps = Omit<
  ComponentProps<typeof PaginationLink>,
  'aria-label' | 'children'
> & {
  accessibleLabel: string;
  label: string;
  hideLabel?: boolean;
};

function PaginationPrevious({
  className,
  accessibleLabel,
  label,
  hideLabel,
  ...props
}: PaginationDirectionProps) {
  return (
    <PaginationLink
      aria-label={accessibleLabel}
      size='default'
      className={cn(
        `
          gap-1 px-2.5
          sm:pl-2.5
        `,
        className
      )}
      {...props}
    >
      <TbChevronLeft aria-hidden='true' />
      {!hideLabel && (
        <span
          className={`
            hidden
            sm:block
          `}
        >
          {label}
        </span>
      )}
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  accessibleLabel,
  label,
  hideLabel,
  ...props
}: PaginationDirectionProps) {
  return (
    <PaginationLink
      aria-label={accessibleLabel}
      size='default'
      className={cn(
        `
          gap-1 px-2.5
          sm:pr-2.5
        `,
        className
      )}
      {...props}
    >
      {!hideLabel && (
        <span
          className={`
            hidden
            sm:block
          `}
        >
          {label}
        </span>
      )}
      <TbChevronRight aria-hidden='true' />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  label,
  ...props
}: ComponentProps<'span'> & { label: string }) {
  return (
    <span
      data-slot='pagination-ellipsis'
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <TbDots aria-hidden='true' className='size-4' />
      <span className='sr-only'>{label}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
