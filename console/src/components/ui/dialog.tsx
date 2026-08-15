'use client';

import * as React from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { TbX } from 'react-icons/tb';

import { useLocale } from '@/context/LocaleContext';

import { cn } from '@/utils/tw';

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot='dialog-overlay'
      className={cn(
        `
          fixed inset-0 z-50 bg-overlay/50
          data-[state=closed]:animate-out data-[state=closed]:duration-100
          data-[state=closed]:ease-in data-[state=closed]:fade-out-0
          data-[state=open]:animate-in data-[state=open]:duration-150
          data-[state=open]:ease-out data-[state=open]:fade-in-0
        `,
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  const { dict } = useLocale();
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  return (
    <DialogPortal data-slot='dialog-portal'>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot='dialog-content'
        className={cn(
          `
            fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)]
            translate-[-50%] gap-4 rounded-[2px] border border-border
            bg-background p-6
            data-[state=closed]:animate-out data-[state=closed]:duration-100
            data-[state=closed]:ease-in data-[state=closed]:fade-out-0
            data-[state=open]:animate-in data-[state=open]:duration-150
            data-[state=open]:ease-out data-[state=open]:fade-in-0
            sm:max-w-lg
          `,
          className
        )}
        onOpenAutoFocus={(event) => {
          const activeElement = document.activeElement;
          returnFocusRef.current =
            activeElement instanceof HTMLElement &&
            activeElement !== document.body
              ? activeElement
              : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;

          const returnTarget = returnFocusRef.current;
          if (returnTarget?.isConnected) {
            event.preventDefault();
            returnTarget.focus({ preventScroll: true });
          }
          returnFocusRef.current = null;
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className={`
              absolute top-4 right-4 rounded-[2px] opacity-70 transition-opacity
              duration-150 ease-out
              hover:opacity-100
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-accent
              disabled:pointer-events-none
              [&_svg]:pointer-events-none [&_svg]:shrink-0
              [&_svg:not([class*='size-'])]:size-4
            `}
          >
            <TbX />
            <span className='sr-only'>{closeLabel ?? dict.common.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn(
        `
          flex flex-col gap-2 text-center
          sm:text-left
        `,
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        `
          flex flex-col-reverse gap-2
          sm:flex-row sm:justify-end
        `,
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
