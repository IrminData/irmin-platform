'use client';

import { memo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useLocale } from '@/context/LocaleContext';

import type { ConflictAction, QueuedFile } from '@/hooks/api/useFileUpload';

interface FileConflictDialogProps {
  /** The file that has a conflict */
  file: QueuedFile;
  /** Callback when user selects an action */
  onSelect: (action: ConflictAction) => void;
}

/** Resolve an upload conflict without letting focus escape behind the prompt. */
const FileConflictDialog = ({ file, onSelect }: FileConflictDialogProps) => {
  const { dict } = useLocale();
  const skipRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const conflictDict = dict.repository.objects.uploadFiles.conflict;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onSelect('skip');
      }}
    >
      <DialogContent
        role='alertdialog'
        showCloseButton={false}
        className='
          border-warning/50
          sm:max-w-md
        '
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          skipRef.current?.focus();
        }}
      >
        <DialogHeader className='text-start'>
          <DialogTitle>{conflictDict.title}</DialogTitle>
          <DialogDescription className='text-pretty text-foreground'>
            {conflictDict.message.replace('{filename}', file.file.name)}
          </DialogDescription>
        </DialogHeader>

        <div
          className='
            grid grid-cols-1 gap-2
            sm:grid-cols-2
          '
        >
          <Button
            ref={skipRef}
            variant='secondary'
            onClick={() => onSelect('skip')}
          >
            {conflictDict.skip}
          </Button>
          <Button variant='accent' onClick={() => onSelect('replace')}>
            {conflictDict.replace}
          </Button>
          <Button variant='outline' onClick={() => onSelect('skipAll')}>
            {conflictDict.skipAll}
          </Button>
          <Button variant='outline' onClick={() => onSelect('replaceAll')}>
            {conflictDict.replaceAll}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(FileConflictDialog);
