'use client';

import Button from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Commit } from '@/types/core/Commit';

/**
 * Modal content to show the last modification details
 *
 * @param props - The props
 * @param props.commit - The commit to show the details for
 * @param props.viewRef - Callback to view the commit
 * @param props.closeModal - Callback to close the modal
 * @returns The last modification modal content component.
 */
export default function LastModificationModalContent({
  commit,
  viewRef,
  closeModal,
}: {
  commit: Commit;
  viewRef: (ref: string) => void;
  closeModal: () => void;
}) {
  const { irminAlert } = usePopup();
  const { dict, locale } = useLocale();

  return (
    <div
      className='flex flex-col gap-4 pb-6'
      id='last-modification-modal-content'
    >
      {/* Table with the commit details reworked using shadcn/ui table components */}
      <Table className='w-full text-sm'>
        <TableBody>
          <TableRow>
            <TableCell className='pb-2 font-bold'>
              {dict.common.description}
            </TableCell>
            <TableCell className='pb-2'>{commit.message}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className='pb-2 font-bold'>{dict.list.author}</TableCell>
            <TableCell className='pb-2'>{commit.author}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className='pb-2 font-bold'>
              {dict.common.timestamp}
            </TableCell>
            <TableCell className='pb-2'>
              {new Date(commit.timestamp).toLocaleString(locale)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className='pb-2 font-bold'>
              {dict.repository.commit.commitHash}
            </TableCell>
            <TableCell className='pb-2'>
              {commit.hash.substring(0, 40)}...
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* Buttons */}
      <Button
        variant='default'
        size='sm'
        className='w-full'
        onClick={() => {
          viewRef(commit.hash);
          closeModal();
        }}
      >
        {dict.list.view}
      </Button>
      <Button
        variant='secondary'
        size='sm'
        className='w-full'
        onClick={() => {
          navigator.clipboard.writeText(commit.hash);
          irminAlert('success', dict.repository.commit.commitHashCopied);
          closeModal();
        }}
      >
        {dict.repository.commit.copyHash}
      </Button>
      <Button
        variant='secondary'
        size='sm'
        className='w-full'
        onClick={closeModal}
      >
        {dict.common.close}
      </Button>
    </div>
  );
}
