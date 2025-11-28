'use client';

import type { HTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

// Define the variant styles for the StatusBadge component using class-variance-authority (cva)
const statusBadgeVariants = cva(
  `
    flex h-full max-h-8 w-20 items-center justify-center rounded-full p-1
    text-center text-xs text-white shadow-xs
  `,
  {
    variants: {
      status: {
        '': `
          bg-gray-400
          dark:bg-gray-600
        `,
        private: 'bg-irmin-teal-400',
        public: 'bg-irmin-teal-500',
        connected: 'bg-irmin-teal-600',
        cancelled: `
          bg-gray-200 text-gray-800
          dark:bg-gray-800 dark:text-gray-200
        `,
        error: `bg-destructive text-destructive-foreground`,
        complete: 'bg-accent/80 text-accent-foreground',
        running: 'bg-irmin-blue-500',
        paused: `
          bg-gray-400
          dark:bg-gray-600
        `,
        pending: `
          bg-gray-400
          dark:bg-gray-600
        `,
        initiating: `
          bg-gray-400
          dark:bg-gray-600
        `,
        default: 'bg-irmin-green-500 text-black',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

// Define the prop types for the StatusBadge component using TypeScript
interface StatusBadgeProps
  extends
    HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string;
}

// Create the StatusBadge component with the new structure and variant-based styles
const StatusBadge = ({
  status,
  label,
  className,
  ...props
}: StatusBadgeProps) => {
  // Capitalise the first letter of the label
  const capitalisedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className={cn(statusBadgeVariants({ status, className }))} {...props}>
      {capitalisedLabel}
    </div>
  );
};

export default StatusBadge;
