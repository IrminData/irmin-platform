'use client';

import type { MouseEvent } from 'react';

import { TbX } from 'react-icons/tb';

import { cn } from '@/utils/tw';

import type { Tag } from '@/types/core/Tag';

const sizeClasses = {
  sm: {
    container: 'px-2 py-1 text-xs gap-1.5',
    circle: 'h-3 w-3',
    deleteIcon: 10,
  },
  md: {
    container: 'px-2.5 py-1.5 text-sm gap-2',
    circle: 'h-4 w-4',
    deleteIcon: 12,
  },
};

/**
 * Visualise a tag with a name and a color.
 *
 * @param props - The props for the TagBadge component.
 * @param props.tag - The tag to visualise.
 * @param props.onClick - The function to call when the tag is clicked.
 * @param props.className - The class name to apply to the tag.
 * @param props.showDelete - Whether to show the delete button.
 * @param props.onDelete - The function to call when the delete button is clicked.
 * @param props.size - The size of the tag.
 */
export default function TagBadge({
  tag,
  onClick,
  className,
  showDelete = false,
  onDelete,
  size = 'md',
}: {
  tag: Tag;
  onClick?: () => void;
  className?: string;
  showDelete?: boolean;
  onDelete?: (e: MouseEvent) => void;
  size?: 'md' | 'sm';
}) {
  const sizeConfig = sizeClasses[size];

  return (
    <div
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        `
          inline-flex items-center rounded-full border border-gray-200
          bg-gray-50 font-medium transition-colors
          dark:border-gray-700 dark:bg-gray-800
        `,
        sizeConfig.container,
        onClick &&
          `
            cursor-pointer
            hover:bg-gray-100
            dark:hover:bg-gray-700
          `,
        className
      )}
      onClick={onClick}
    >
      {/* Circular color indicator */}
      <div
        className={cn(
          `
            rounded-full border border-gray-300
            dark:border-gray-600
          `,
          sizeConfig.circle
        )}
        style={{ backgroundColor: tag.color }}
      />

      {/* Tag name */}
      <span
        className={`
          text-gray-900
          dark:text-gray-100
        `}
      >
        {tag.name}
      </span>

      {/* Delete button */}
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(e);
          }}
          className={`
            rounded-full p-0.5 transition-colors
            hover:bg-gray-200
            dark:hover:bg-gray-600
          `}
          aria-label={`Remove ${tag.name} tag`}
        >
          <TbX size={sizeConfig.deleteIcon} />
        </button>
      )}
    </div>
  );
}
