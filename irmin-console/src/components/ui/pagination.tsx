import type { ComponentProps, MouseEvent } from 'react';

import { TbChevronLeft, TbChevronRight, TbDots } from 'react-icons/tb';

import type { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';

import { cn } from '@/utils/tw';

function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      role='navigation'
      aria-label='pagination'
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
  ComponentProps<'a'> & {
    isActive?: boolean;
    label?: string;
  };

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          props.onClick?.(e as unknown as MouseEvent<HTMLAnchorElement>);
        }
      }}
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
      {...props}
    >
      {props.children}
    </a>
  );
}

function PaginationPrevious({
  className,
  label,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to previous page'
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
      <TbChevronLeft />
      <span
        className={`
          hidden
          sm:block
        `}
      >
        {label ?? 'Previous'}
      </span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  label,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to next page'
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
      <span
        className={`
          hidden
          sm:block
        `}
      >
        {label ?? 'Next'}
      </span>
      <TbChevronRight />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot='pagination-ellipsis'
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <TbDots className='size-4' />
      <span className='sr-only'>More pages</span>
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
