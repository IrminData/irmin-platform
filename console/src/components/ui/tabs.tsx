'use client';

import type * as React from 'react';

import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/utils/tw';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      className={cn(
        `
          flex flex-col gap-2
          focus:outline-none
          focus-visible:outline-none
        `,
        className
      )}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(
        `
          inline-flex h-9 w-fit items-center justify-start gap-1 border-b
          border-border text-muted-foreground
        `,
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot='tabs-trigger'
      className={cn(
        `
          relative -mb-px inline-flex h-full items-center justify-center gap-1.5
          border-b border-transparent px-3 py-1 text-sm font-medium
          whitespace-nowrap text-muted-foreground transition-colors duration-150
          hover:text-foreground
          focus-visible:outline-1 focus-visible:outline-offset-0
          focus-visible:outline-accent/70
          disabled:pointer-events-none disabled:opacity-50
          data-[state=active]:border-accent data-[state=active]:text-foreground
          [&_svg]:pointer-events-none [&_svg]:shrink-0
          [&_svg:not([class*='size-'])]:size-4
        `,
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot='tabs-content'
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
