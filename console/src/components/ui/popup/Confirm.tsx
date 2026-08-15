'use client';

import { memo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modal confirmation with a consequence-specific action label.
 *
 * The shared Radix dialog supplies focus containment, Escape and outside-click
 * dismissal, background inerting, and focus restoration. Cancel receives
 * initial focus so a destructive action is never the keyboard default.
 */
const Confirm = ({
  type,
  message,
  confirmLabel,
  onSelect,
}: {
  type: 'info' | 'warning';
  message: string;
  confirmLabel: string;
  onSelect: (_confirmed: boolean) => void;
}) => {
  const { dict } = useLocale();
  const cancelRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onSelect(false);
      }}
    >
      <DialogContent
        role='alertdialog'
        showCloseButton={false}
        className={type === 'warning' ? 'border-destructive/60' : undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <DialogHeader className='text-start'>
          <DialogTitle>{confirmLabel}</DialogTitle>
          <DialogDescription className='text-pretty text-foreground'>
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancelRef}
            variant='secondary'
            onClick={() => onSelect(false)}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant={type === 'warning' ? 'destructive' : 'accent'}
            onClick={() => onSelect(true)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(Confirm);
