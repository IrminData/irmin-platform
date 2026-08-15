'use client';

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/tw';

const labelVariants = cva(
  `
    type-mono-label leading-none text-foreground
    peer-disabled:cursor-not-allowed peer-disabled:opacity-70
  `
);

const Label = forwardRef<
  ComponentRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
