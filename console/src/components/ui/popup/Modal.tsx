import type React from 'react';
import { memo } from 'react';

import { TbX } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useLocale } from '@/context/LocaleContext';

/**
 * Accessible application modal.
 *
 * The shared Radix dialog supplies focus entry, containment, Escape dismissal,
 * background inerting, and focus restoration for modal content opened through
 * `usePopup`.
 */
const Modal = ({
  isOpen,
  title,
  children,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  const { dict } = useLocale();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className='
          max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0
          sm:max-w-lg
        '
      >
        <DialogHeader
          className={`
            flex-row items-center justify-between gap-4 border-b border-border
            px-4 py-3 text-start
          `}
        >
          <DialogTitle className='text-lg font-semibold'>{title}</DialogTitle>
          <Button
            size='icon'
            variant='ghost'
            onClick={onClose}
            aria-label={dict.common.close}
          >
            <TbX aria-hidden='true' className='size-5' />
          </Button>
        </DialogHeader>
        <div className='min-h-0 overflow-y-auto p-4'>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(Modal);
