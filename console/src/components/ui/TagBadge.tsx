'use client';

import { type MouseEvent, useId } from 'react';

import { TbX } from 'react-icons/tb';

import { cn } from '@/utils/tw';

import type { Tag } from '@/types/core/Tag';

const sizeClasses = {
  sm: {
    container: 'min-h-6 gap-1.5 px-2 py-0.5 text-xs',
    circle: 'size-3',
    deleteIcon: 'size-3',
  },
  md: {
    container: 'min-h-7 gap-2 px-2.5 py-1 text-sm',
    circle: 'size-4',
    deleteIcon: 'size-3.5',
  },
};

type CommonTagBadgeProps = {
  tag: Tag;
  onClick?: () => void;
  className?: string;
  size?: 'md' | 'sm';
  selected?: boolean;
  disabled?: boolean;
};

type TagBadgeProps = CommonTagBadgeProps &
  (
    | {
        showDelete: true;
        onDelete: (event: MouseEvent<HTMLButtonElement>) => void;
        removeLabel: string;
      }
    | {
        showDelete?: false;
        onDelete?: never;
        removeLabel?: never;
      }
  );

/**
 * Render a tag as display text, a native action, or two sibling actions when
 * removal is available. Interactive descendants are never nested.
 */
export default function TagBadge({
  tag,
  onClick,
  className,
  showDelete = false,
  onDelete,
  removeLabel,
  size = 'md',
  selected,
  disabled = false,
}: TagBadgeProps) {
  const sizeConfig = sizeClasses[size];
  const labelId = useId();
  const content = (
    <>
      <span
        aria-hidden='true'
        className={cn(
          'shrink-0 rounded-full border border-border',
          sizeConfig.circle
        )}
        style={{ backgroundColor: tag.color }}
      />
      <span id={labelId} className='min-w-0 truncate text-foreground'>
        {tag.name}
      </span>
    </>
  );

  return (
    <span
      className={cn(
        `
          inline-flex items-center rounded-full border border-border bg-card
          font-medium transition-[color,background-color,border-color]
          duration-150
        `,
        sizeConfig.container,
        selected && 'border-accent bg-accent/10',
        disabled && 'opacity-50',
        className
      )}
    >
      {onClick ? (
        <button
          type='button'
          onClick={onClick}
          disabled={disabled}
          aria-pressed={selected}
          className={`
            inline-flex min-h-6 min-w-6 items-center gap-1.5 rounded-full
            transition-[color,background-color,transform] duration-150
            hover:bg-muted
            focus-visible:outline-2 focus-visible:outline-offset-1
            focus-visible:outline-accent
            active:scale-[0.96]
            disabled:pointer-events-none
          `}
        >
          {content}
        </button>
      ) : (
        <span className='inline-flex items-center gap-1.5'>{content}</span>
      )}

      {showDelete && (
        <button
          type='button'
          onClick={onDelete}
          disabled={disabled}
          aria-label={removeLabel}
          aria-describedby={labelId}
          className={`
            inline-flex size-6 items-center justify-center rounded-full
            transition-[color,background-color,transform] duration-150
            hover:bg-muted
            focus-visible:outline-2 focus-visible:outline-offset-1
            focus-visible:outline-accent
            active:scale-[0.96]
            disabled:pointer-events-none
          `}
        >
          <TbX aria-hidden='true' className={sizeConfig.deleteIcon} />
        </button>
      )}
    </span>
  );
}
