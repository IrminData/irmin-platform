'use client';

import React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

// Define the variant styles for the StatusBadge component using class-variance-authority (cva)
const statusBadgeVariants = cva(
  'flex h-full max-h-8 w-20 items-center justify-center rounded-full shadow-sm p-1 text-center text-white text-xs',
  {
    variants: {
      status: {
        private: 'bg-irmin_teal-400',
        public: 'bg-irmin_teal',
        connected: 'bg-irmin_teal-600',
        error: 'bg-destructive',
        complete: 'bg-irmin_green text-black',
        running: 'bg-irmin_blue-500',
        paused: 'bg-gray-400',
        pending: 'bg-gray-400',
        initiating: 'bg-gray-400',
        default: 'bg-irmin_green text-black',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

// Define the prop types for the StatusBadge component using TypeScript
interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string;
}

// Create the StatusBadge component with the new structure and variant-based styles
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  ...props
}) => {
  // Capitalise the first letter of the label
  const capitalisedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className={cn(statusBadgeVariants({ status, className }))} {...props}>
      {capitalisedLabel}
    </div>
  );
};

export { statusBadgeVariants };
export default StatusBadge;
