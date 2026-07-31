import type React from 'react';
import { memo, useCallback, useEffect } from 'react';

import { IoClose } from 'react-icons/io5';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import { useLocale } from '@/context/LocaleContext';

/**
 * Modal UI component
 *
 * @remarks
 *
 * UI for displaying a modal with a title and content.
 *
 * This modal is shown when the user needs to interact with a form or a message.
 * The position of the modal is fixed in the center of the screen.
 *
 * @param modalDetails - The details of the modal
 * @param modalDetails.isOpen - Whether the modal is open
 * @param modalDetails.title - The title of the modal
 * @param modalDetails.children - The content of the modal
 * @param modalDetails.onClose - The function to call when the user closes the modal
 *
 * @returns The modal component
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      id='irmin-modal'
      role='dialog'
      aria-modal='true'
      aria-label={title}
      className={`
        fixed inset-0 z-50 flex animate-in items-center justify-center
        bg-background/30 backdrop-blur-[2px] fade-in
      `}
    >
      <div className='w-[500px] max-w-[90vw] pt-[40px]'>
        <div className='rounded-lg border border-border bg-popover shadow-lg'>
          <div
            className={`
              flex flex-row items-center justify-between border-b px-4 pt-4 pb-2
              dark:border-b-gray-800
            `}
          >
            <h2 className='text-lg font-normal'>{title}</h2>
            <ButtonWithTooltip
              size='icon'
              variant='ghost'
              className='ml-4 rounded-full'
              onClick={onClose}
              aria-label={dict.common.close}
              tooltip={dict.common.close}
              icon={<IoClose size={24} />}
            />
          </div>
          <div
            className={`relative max-h-[calc(100vh-150px)] overflow-scroll p-4`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Modal);
