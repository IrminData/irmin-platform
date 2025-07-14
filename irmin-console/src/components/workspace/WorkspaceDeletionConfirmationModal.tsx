'use client';

import type { Dictionary } from '@/lib/dict';

import { Button } from '@/components/ui/button';

/**
 * Content for the workspace deletion confirmation modal
 */
export default function WorkspaceDeletionConfirmationModal({
  dict,
  close,
  handleDelete,
}: {
  dict: Dictionary;
  close: () => void;
  handleDelete: () => void;
}) {
  return (
    <div className='pb-4'>
      <p className='mb-4'>{dict.workspace.deletionWarning}</p>
      <div className='flex justify-end gap-4'>
        <Button
          variant='ghost'
          onClick={() => {
            close();
          }}
        >
          {dict.common.cancel}
        </Button>
        <Button
          variant='destructive'
          onClick={() => {
            close();
            handleDelete();
          }}
        >
          {dict.list.delete}
        </Button>
      </div>
    </div>
  );
}
