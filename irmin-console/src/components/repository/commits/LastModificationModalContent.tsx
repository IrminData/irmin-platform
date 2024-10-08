'use client';

import Button from '@/components/ui/Button';

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
      {/* Table with the commit details */}
      <table className='w-full table-auto text-sm'>
        <tbody>
          <tr>
            <td className='pb-2 font-bold'>{dict.list.description}</td>
            <td className='pb-2'>{commit.message}</td>
          </tr>
          <tr>
            <td className='pb-2 font-bold'>{dict.list.author}</td>
            <td className='pb-2'>{commit.author}</td>
          </tr>
          <tr>
            <td className='pb-2 font-bold'>{dict.misc.timestamp}</td>
            <td className='pb-2'>
              {new Date(commit.timestamp).toLocaleString(locale)}
            </td>
          </tr>
          <tr>
            <td className='pb-2 font-bold'>
              {dict.repository.commit.commitHash}
            </td>
            <td className='pb-2'>{commit.hash.substring(0, 40)}...</td>
          </tr>
        </tbody>
      </table>
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
        {dict.misc.close}
      </Button>
    </div>
  );
}
