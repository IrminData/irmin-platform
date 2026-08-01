'use client';

import { memo } from 'react';

import { TbCheck, TbClock, TbLoader2, TbSlash, TbX } from 'react-icons/tb';

import { ButtonWithTooltip } from '@/components/ui/button-with-tooltip';

import { useLocale } from '@/context/LocaleContext';

import type { QueuedFile, QueuedFileStatus } from '@/hooks/api/useFileUpload';

import { formatFileSizeForUI } from '@/utils/formatFileSizeForUI';

interface UploadQueueItemProps {
  /** The queued file to display */
  file: QueuedFile;
  /** Callback to remove the file from the queue */
  onRemove: (id: string) => void;
}

/**
 * Get the status icon for a file
 */
function getStatusIcon(status: QueuedFileStatus): React.ReactNode {
  switch (status) {
    case 'pending':
      return <TbClock className='size-4 text-gray-400' />;
    case 'checking':
    case 'uploading':
      return <TbLoader2 className='size-4 animate-spin text-irmin-blue-500' />;
    case 'completed':
      return <TbCheck className='size-4 text-green-500' />;
    case 'failed':
      return <TbX className='size-4 text-destructive' />;
    case 'skipped':
      return <TbSlash className='size-4 text-gray-400' />;
    case 'conflict':
      return <TbLoader2 className='size-4 animate-spin text-yellow-500' />;
    default:
      return null;
  }
}

/**
 * Individual file row in the upload queue
 *
 * @param props - Component properties
 * @returns The UploadQueueItem component
 */
const UploadQueueItem = ({ file, onRemove }: UploadQueueItemProps) => {
  const { dict } = useLocale();

  const canRemove = file.status === 'pending';
  const statusLabel = dict.repository.objects.uploadFiles.status[file.status];

  return (
    <div
      className={`
        flex items-center justify-between gap-2 rounded-md border px-3 py-2
        ${file.status === 'failed' ? 'border-destructive/50 bg-destructive/5' : ''}
        ${file.status === 'completed' ? 'border-green-500/50 bg-green-500/5' : ''}
        ${
          file.status === 'skipped'
            ? `
              border-gray-300 bg-gray-100
              dark:border-gray-600 dark:bg-gray-800
            `
            : ''
        }
        ${
          !['failed', 'completed', 'skipped'].includes(file.status)
            ? `
              border-gray-200
              dark:border-gray-700
            `
            : ''
        }
      `}
    >
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {getStatusIcon(file.status)}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>{file.file.name}</p>
          <p className='text-xs text-gray-500'>
            {formatFileSizeForUI(file.file.size)}
            {file.status !== 'pending' && (
              <span className='ml-2'>{statusLabel}</span>
            )}
          </p>
          {file.error && (
            <p className='mt-1 text-xs text-destructive'>{file.error}</p>
          )}
        </div>
      </div>

      {canRemove && (
        <ButtonWithTooltip
          variant='ghost'
          size='icon'
          onClick={() => onRemove(file.id)}
          tooltip={dict.common.remove}
          icon={<TbX className='size-4' />}
          aria-label='Remove file from queue'
        />
      )}
    </div>
  );
};

export default memo(UploadQueueItem);
