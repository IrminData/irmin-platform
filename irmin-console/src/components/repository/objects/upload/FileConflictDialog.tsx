'use client';

import { memo } from 'react';

import { IoClose } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import { useLocale } from '@/context/LocaleContext';

import type { ConflictAction, QueuedFile } from '@/hooks/api/useFileUpload';

interface FileConflictDialogProps {
  /** The file that has a conflict */
  file: QueuedFile;
  /** Callback when user selects an action */
  onSelect: (action: ConflictAction) => void;
}

/**
 * Conflict resolution dialog with 4 options
 *
 * Displayed when a file being uploaded already exists at the target path.
 * Follows the same positioning pattern as Confirm.tsx (fixed at bottom of screen).
 *
 * @param props - Component properties
 * @returns The FileConflictDialog component
 */
const FileConflictDialog = ({ file, onSelect }: FileConflictDialogProps) => {
  const { dict } = useLocale();

  const conflictDict = dict.repository.objects.uploadFiles.conflict;

  return (
    <div
      className={`
        fixed bottom-[20px] z-50 flex w-screen animate-in justify-center p-4
        align-middle fade-in
      `}
    >
      <div
        className={`
          flex w-[450px] max-w-[90vw] flex-col items-start justify-between
          rounded-lg border border-yellow-500 bg-gray-50 p-4 shadow-md
          dark:bg-irmin-black-500
        `}
      >
        {/* Header */}
        <div className='flex w-full flex-row items-start justify-between gap-2'>
          <div className='flex-1'>
            <p className='text-base font-semibold'>{conflictDict.title}</p>
            <p
              className={`
                mt-1 text-sm text-gray-600
                dark:text-gray-400
              `}
            >
              {conflictDict.message.replace('{filename}', file.file.name)}
            </p>
          </div>
          <ButtonWithTooltip
            size='icon'
            variant='ghost'
            onClick={() => onSelect('skip')}
            aria-label='Close conflict dialog'
            tooltip={dict.common.close}
            icon={<IoClose size={22} />}
          />
        </div>

        {/* Action buttons */}
        <div className='mt-4 grid w-full grid-cols-2 gap-2'>
          <Button
            variant='secondary'
            onClick={() => onSelect('skip')}
            aria-label='Skip this file'
            size='sm'
          >
            {conflictDict.skip}
          </Button>
          <Button
            variant='default'
            onClick={() => onSelect('replace')}
            aria-label='Replace this file'
            size='sm'
          >
            {conflictDict.replace}
          </Button>
          <Button
            variant='outline'
            onClick={() => onSelect('skipAll')}
            aria-label='Skip all conflicting files'
            size='sm'
          >
            {conflictDict.skipAll}
          </Button>
          <Button
            variant='outline'
            onClick={() => onSelect('replaceAll')}
            aria-label='Replace all conflicting files'
            size='sm'
          >
            {conflictDict.replaceAll}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(FileConflictDialog);
